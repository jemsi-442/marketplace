<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Booking;
use App\Entity\Escrow;
use App\Entity\User;
use App\Exception\Domain\EscrowRequiresManualReviewException;
use App\Exception\Domain\InvalidStateTransitionException;
use App\Exception\Domain\UnauthorizedFinancialOperationException;
use App\Repository\EscrowRepository;
use App\Support\MobileMoneyProviderCatalog;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;

class EscrowService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EscrowRepository $escrowRepository,
        private readonly EscrowAuditLogger $auditLogger,
        private readonly VendorWalletService $vendorWalletService,
        private readonly PlatformFeeService $platformFeeService,
        private readonly SnippeClient $snippeClient,
        private readonly EscrowRiskEvaluator $riskEvaluator,
        private readonly VendorTrustCalculator $trustCalculator,
        private readonly FraudMonitoringService $fraudMonitoringService
    ) {
    }

    private function isAdmin(User $user): bool
    {
        $roles = $user->getRoles();

        return in_array('ROLE_ADMIN', $roles, true) || in_array('ROLE_SUPER_ADMIN', $roles, true);
    }

    public function createEscrow(Booking $booking, User $client, int $amountMinor, string $currency): Escrow
    {
        if ($booking->getEscrow() !== null) {
            throw new \LogicException('Escrow already exists for this booking.');
        }

        $vendor = $booking->resolveVendorUser();
        if ($vendor === null) {
            throw new \LogicException('Booking vendor is not assigned.');
        }

        if ($client->getId() !== $booking->getClient()->getId()) {
            throw new UnauthorizedFinancialOperationException('Only booking owner can create escrow.');
        }

        return $this->em->wrapInTransaction(function () use ($booking, $client, $vendor, $amountMinor, $currency): Escrow {
            $reference = sprintf('escrow_%s_%d', bin2hex(random_bytes(5)), $booking->getId());
            $escrow = new Escrow($reference, $client, $vendor, $amountMinor, $currency);
            $escrow->setBooking($booking);

            $this->em->persist($escrow);
            $riskProfile = $this->riskEvaluator->evaluateAtCreation($escrow, [
                'source' => 'ESCROW_CREATE',
            ]);

            if ($riskProfile !== null) {
                $this->auditLogger->log($escrow, 'ESCROW_RISK_PROFILE_CREATED', $client, [
                    'final_risk_score' => $riskProfile->getFinalRiskScore(),
                    'manual_review_required' => $riskProfile->isManualReviewRequired(),
                ]);
            }

            $this->auditLogger->log($escrow, 'ESCROW_CREATED', $client, [
                'amount_minor' => $amountMinor,
                'currency' => strtoupper($currency),
            ]);
            $this->em->flush();

            return $escrow;
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function initiateCollectionPayment(Escrow $escrow, string $msisdn, string $provider, string $callbackUrl): array
    {
        $normalizedMsisdn = MobileMoneyProviderCatalog::normalizeTanzanianMsisdn($msisdn);
        if ($normalizedMsisdn === null) {
            throw new \InvalidArgumentException('Use a valid Tanzania mobile number such as 07XXXXXXXX or 2557XXXXXXX');
        }

        $normalizedProvider = MobileMoneyProviderCatalog::normalizeProvider($provider);
        if ($normalizedProvider === null) {
            throw new \InvalidArgumentException('Unsupported mobile money provider');
        }

        $idempotencyKey = 'collect_' . $escrow->getReference();

        /** @return array<string, mixed> */
        return $this->em->wrapInTransaction(function () use ($escrow, $normalizedMsisdn, $normalizedProvider, $callbackUrl, $idempotencyKey): array {
            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            if ($escrow->getStatus() !== Escrow::STATUS_CREATED) {
                throw new InvalidStateTransitionException('Payment prompt can only be created while escrow is awaiting funding.');
            }

            $riskMetadata = $escrow->getRiskMetadata();
            if (($riskMetadata['manual_review_required'] ?? false) === true) {
                throw new EscrowRequiresManualReviewException('Escrow is flagged for manual review before collection.');
            }

            $clientEmail = $escrow->getClient()->getEmail();
            $localPart = strtok($clientEmail, '@');
            $localPart = $localPart !== false ? $localPart : 'Client';
            $response = $this->snippeClient->createCollection(
                reference: $escrow->getReference(),
                amountMinor: $escrow->getAmountMinor(),
                currency: $escrow->getCurrency(),
                msisdn: $normalizedMsisdn,
                provider: $normalizedProvider,
                callbackUrl: $callbackUrl,
                idempotencyKey: $idempotencyKey,
                customerEmail: $clientEmail,
                customerFirstName: ucfirst($localPart),
                customerLastName: 'Client'
            );

            $responseData = $response['data'] ?? null;
            $snippeReferenceRaw = is_array($responseData) ? ($responseData['reference'] ?? '') : '';
            $snippeReference = is_scalar($snippeReferenceRaw) ? (string) $snippeReferenceRaw : '';
            if ($snippeReference !== '') {
                $escrow->setExternalPaymentReferenceForIntent($snippeReference, $response);
            }

            $this->em->flush();

            return $response;
        });
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function handleCollectionWebhook(array $payload): void
    {
        $referenceRaw = $payload['reference'] ?? '';
        $statusRaw = $payload['status'] ?? '';
        $externalTransactionIdRaw = $payload['transaction_id'] ?? ($payload['id'] ?? '');
        $gatewayReferenceRaw = $payload['gateway_reference'] ?? null;

        $reference = is_scalar($referenceRaw) ? (string) $referenceRaw : '';
        $status = strtoupper(is_scalar($statusRaw) ? (string) $statusRaw : '');
        $externalTransactionId = is_scalar($externalTransactionIdRaw) ? (string) $externalTransactionIdRaw : '';
        $gatewayReference = is_scalar($gatewayReferenceRaw) ? (string) $gatewayReferenceRaw : $reference;

        if ($reference === '' || $status === '') {
            throw new \InvalidArgumentException('Collection webhook missing required fields.');
        }

        $this->em->wrapInTransaction(function () use ($payload, $reference, $status, $externalTransactionId, $gatewayReference): void {
            $escrow = $this->escrowRepository->findOneByExternalPaymentReference($reference)
                ?? $this->escrowRepository->findOneByReference($reference);
            if ($escrow === null) {
                throw new \RuntimeException('Escrow reference not found.');
            }

            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            if ($status !== 'SUCCESS') {
                $this->fraudMonitoringService->recordFailedPayment($escrow->getClient(), [
                    'escrow_reference' => $reference,
                    'status' => $status,
                ]);
                $this->auditLogger->log($escrow, 'ESCROW_COLLECTION_NON_SUCCESS', null, [
                    'status' => $status,
                    'payload' => $payload,
                ]);
                $this->em->flush();

                return;
            }

            if ($externalTransactionId === '') {
                throw new \InvalidArgumentException('Collection success webhook missing transaction id.');
            }

            if ($escrow->getStatus() !== Escrow::STATUS_CREATED) {
                if ($escrow->getExternalTransactionId() === $externalTransactionId) {
                    return;
                }

                throw new \RuntimeException('Escrow already processed with a different transaction id.');
            }

            $escrow->transitionToFunded(
                externalPaymentReference: $gatewayReference,
                externalTransactionId: $externalTransactionId,
                snapshot: $payload
            );
            $this->vendorWalletService->recordEscrowFunding($escrow, 'escrow_funding_' . $escrow->getReference());
            $escrow->transitionToActive();

            $this->auditLogger->log($escrow, 'ESCROW_FUNDED', null, [
                'external_transaction_id' => $externalTransactionId,
                'payload' => $payload,
            ]);
            $this->auditLogger->log($escrow, 'ESCROW_ACTIVE', null, ['reason' => 'payment_success']);

            $booking = $escrow->getBooking();
            if ($booking !== null) {
                $booking->setStatus(Booking::STATUS_CONFIRMED);
                if ($booking->getClientRequest() !== null) {
                    $booking->getClientRequest()->setStatus(\App\Entity\ClientRequest::STATUS_FUNDED);
                }
            }

            $this->em->flush();
        });
    }

    public function releaseByClient(Escrow $escrow, User $client): void
    {
        $this->em->wrapInTransaction(function () use ($escrow, $client): void {
            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            if ($escrow->getClient()->getId() !== $client->getId()) {
                throw new UnauthorizedFinancialOperationException('Only escrow client can release funds.');
            }

            $platformFeeMinor = $this->platformFeeService->calculateEscrowFee($escrow->getAmountMinor());
            $this->vendorWalletService->releaseEscrowToVendor($escrow, $platformFeeMinor, 'escrow_release_' . $escrow->getReference());
            $escrow->transitionToReleased();

            $this->auditLogger->log($escrow, 'ESCROW_RELEASED', $client, [
                'gross_minor' => $escrow->getAmountMinor(),
                'platform_fee_minor' => $platformFeeMinor,
                'vendor_net_minor' => $escrow->getAmountMinor() - $platformFeeMinor,
            ]);

            $booking = $escrow->getBooking();
            if ($booking !== null) {
                $booking->setStatus(Booking::STATUS_COMPLETED);
                if ($booking->getClientRequest() !== null) {
                    $booking->getClientRequest()->setStatus(\App\Entity\ClientRequest::STATUS_COMPLETED);
                }
            }
            $this->trustCalculator->recalculateForVendor($escrow->getVendor(), 'ESCROW_RELEASED', [
                'escrow_reference' => $escrow->getReference(),
            ]);

            $this->em->flush();
        });
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function openDispute(Escrow $escrow, User $client, array $metadata = []): void
    {
        $this->em->wrapInTransaction(function () use ($escrow, $client, $metadata): void {
            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            if ($escrow->getClient()->getId() !== $client->getId()) {
                throw new UnauthorizedFinancialOperationException('Only escrow client can open a dispute.');
            }

            $escrow->transitionToDisputed($metadata);
            $booking = $escrow->getBooking();
            if ($booking !== null && $booking->getClientRequest() !== null) {
                $booking->getClientRequest()->setStatus(\App\Entity\ClientRequest::STATUS_DISPUTED);
            }
            $this->fraudMonitoringService->recordMultipleDisputes($escrow->getVendor(), [
                'escrow_reference' => $escrow->getReference(),
            ]);
            $this->auditLogger->log($escrow, 'ESCROW_DISPUTED', $client, ['metadata' => $metadata]);
            $this->em->flush();
        });
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function resolveDispute(Escrow $escrow, User $admin, bool $releaseToVendor, array $metadata = []): void
    {
        if (!$this->isAdmin($admin)) {
            throw new UnauthorizedFinancialOperationException('Admin privileges required.');
        }

        $this->em->wrapInTransaction(function () use ($escrow, $admin, $releaseToVendor, $metadata): void {
            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            if ($releaseToVendor) {
                $platformFeeMinor = $this->platformFeeService->calculateEscrowFee($escrow->getAmountMinor());
                $this->vendorWalletService->releaseEscrowToVendor($escrow, $platformFeeMinor, 'escrow_resolve_' . $escrow->getReference());
            } else {
                $this->vendorWalletService->refundEscrowExternally($escrow, 'escrow_refund_' . $escrow->getReference());
            }

            $escrow->transitionToResolved(array_merge($metadata, [
                'resolution' => $releaseToVendor ? 'VENDOR_RELEASE' : 'CLIENT_REFUND_EXTERNAL',
            ]));
            $this->auditLogger->log($escrow, 'ESCROW_RESOLVED', $admin, [
                'resolution' => $releaseToVendor ? 'VENDOR_RELEASE' : 'CLIENT_REFUND_EXTERNAL',
                'metadata' => $metadata,
            ]);

            $booking = $escrow->getBooking();
            if ($booking !== null) {
                $booking->setStatus($releaseToVendor ? Booking::STATUS_COMPLETED : Booking::STATUS_CANCELLED);
                if ($booking->getClientRequest() !== null) {
                    $booking->getClientRequest()->setStatus(
                        $releaseToVendor
                            ? \App\Entity\ClientRequest::STATUS_COMPLETED
                            : \App\Entity\ClientRequest::STATUS_CANCELLED
                    );
                }
            }

            $this->trustCalculator->recalculateForVendor($escrow->getVendor(), 'DISPUTE_RESOLVED', [
                'escrow_reference' => $escrow->getReference(),
                'release_to_vendor' => $releaseToVendor,
            ]);
            $this->em->flush();
        });
    }
}
