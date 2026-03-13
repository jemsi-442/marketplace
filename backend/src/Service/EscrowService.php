<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Booking;
use App\Entity\Escrow;
use App\Entity\User;
use App\Exception\Domain\EscrowRequiresManualReviewException;
use App\Exception\Domain\UnauthorizedFinancialOperationException;
use App\Repository\EscrowRepository;
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

    public function createEscrow(Booking $booking, User $client, int $amountMinor, string $currency): Escrow
    {
        if ($booking->getEscrow() !== null) {
            throw new \LogicException('Escrow already exists for this booking.');
        }

        $vendor = $booking->getService()?->getVendor()?->getUser();
        if (!$vendor instanceof User) {
            throw new \LogicException('Booking does not resolve to a vendor user.');
        }

        if ($client->getId() !== $booking->getClient()?->getId()) {
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

    public function initiateCollectionPayment(Escrow $escrow, string $msisdn, string $provider, string $callbackUrl): array
    {
        $riskMetadata = $escrow->getRiskMetadata();
        if (($riskMetadata['manual_review_required'] ?? false) === true) {
            throw new EscrowRequiresManualReviewException('Escrow is flagged for manual review before collection.');
        }

        $idempotencyKey = 'collect_' . $escrow->getReference();

        return $this->em->wrapInTransaction(function () use ($escrow, $msisdn, $provider, $callbackUrl, $idempotencyKey): array {
            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            $clientEmail = $escrow->getClient()->getEmail();
            $localPart = explode('@', $clientEmail)[0] ?? 'Client';
            $response = $this->snippeClient->createCollection(
                reference: $escrow->getReference(),
                amountMinor: $escrow->getAmountMinor(),
                currency: $escrow->getCurrency(),
                msisdn: $msisdn,
                provider: $provider,
                callbackUrl: $callbackUrl,
                idempotencyKey: $idempotencyKey,
                customerEmail: $clientEmail,
                customerFirstName: ucfirst($localPart),
                customerLastName: 'Client'
            );

            $snippeReference = (string) (($response['data']['reference'] ?? '') ?: '');
            if ($snippeReference !== '') {
                $escrow->setExternalPaymentReferenceForIntent($snippeReference, $response);
            }

            $this->em->flush();

            return $response;
        });
    }

    public function handleCollectionWebhook(array $payload): void
    {
        $reference = (string) ($payload['reference'] ?? '');
        $status = strtoupper((string) ($payload['status'] ?? ''));
        $externalTransactionId = (string) ($payload['transaction_id'] ?? ($payload['id'] ?? ''));
        $gatewayReference = (string) ($payload['gateway_reference'] ?? $reference);

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
            }
            $this->trustCalculator->recalculateForVendor($escrow->getVendor(), 'ESCROW_RELEASED', [
                'escrow_reference' => $escrow->getReference(),
            ]);

            $this->em->flush();
        });
    }

    public function openDispute(Escrow $escrow, User $client, array $metadata = []): void
    {
        $this->em->wrapInTransaction(function () use ($escrow, $client, $metadata): void {
            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            if ($escrow->getClient()->getId() !== $client->getId()) {
                throw new UnauthorizedFinancialOperationException('Only escrow client can open a dispute.');
            }

            $escrow->transitionToDisputed($metadata);
            $this->fraudMonitoringService->recordMultipleDisputes($escrow->getVendor(), [
                'escrow_reference' => $escrow->getReference(),
            ]);
            $this->auditLogger->log($escrow, 'ESCROW_DISPUTED', $client, ['metadata' => $metadata]);
            $this->em->flush();
        });
    }

    public function resolveDispute(Escrow $escrow, User $admin, bool $releaseToVendor, array $metadata = []): void
    {
        if (!in_array('ROLE_ADMIN', $admin->getRoles(), true)) {
            throw new UnauthorizedFinancialOperationException('Admin privileges required.');
        }

        $this->em->wrapInTransaction(function () use ($escrow, $admin, $releaseToVendor, $metadata): void {
            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            if ($releaseToVendor) {
                $platformFeeMinor = $this->platformFeeService->calculateEscrowFee($escrow->getAmountMinor());
                $this->vendorWalletService->releaseEscrowToVendor($escrow, $platformFeeMinor, 'escrow_resolve_' . $escrow->getReference());
            }

            $escrow->transitionToResolved(array_merge($metadata, [
                'resolution' => $releaseToVendor ? 'VENDOR_RELEASE' : 'CLIENT_REFUND_EXTERNAL',
            ]));
            $this->auditLogger->log($escrow, 'ESCROW_RESOLVED', $admin, [
                'resolution' => $releaseToVendor ? 'VENDOR_RELEASE' : 'CLIENT_REFUND_EXTERNAL',
                'metadata' => $metadata,
            ]);
            $this->trustCalculator->recalculateForVendor($escrow->getVendor(), 'DISPUTE_RESOLVED', [
                'escrow_reference' => $escrow->getReference(),
                'release_to_vendor' => $releaseToVendor,
            ]);
            $this->em->flush();
        });
    }
}
