<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Entity\WithdrawalRequest;
use App\Exception\Domain\UnauthorizedFinancialOperationException;
use App\Repository\WithdrawalRequestRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;

class WithdrawalService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly WithdrawalRequestRepository $withdrawalRepository,
        private readonly VendorWalletService $vendorWalletService,
        private readonly PlatformFeeService $platformFeeService,
        private readonly SnippeClient $snippeClient,
        private readonly FraudMonitoringService $fraudMonitoringService
    ) {
    }

    public function request(User $vendor, int $amountMinor, string $currency, string $msisdn, string $provider): WithdrawalRequest
    {
        if (!in_array('ROLE_VENDOR', $vendor->getRoles(), true)) {
            throw new UnauthorizedFinancialOperationException('Only vendors can request withdrawals.');
        }

        return $this->em->wrapInTransaction(function () use ($vendor, $amountMinor, $currency, $msisdn, $provider): WithdrawalRequest {
            $balance = $this->vendorWalletService->getVendorBalance($vendor, $currency);
            if ($balance < $amountMinor) {
                throw new \RuntimeException('Insufficient wallet balance for withdrawal.');
            }

            $rapidAttempts = (int) $this->withdrawalRepository->createQueryBuilder('w')
                ->select('COUNT(w.id)')
                ->where('w.vendor = :vendor')
                ->andWhere('w.createdAt >= :window')
                ->setParameter('vendor', $vendor)
                ->setParameter('window', new \DateTimeImmutable('-10 minutes'))
                ->getQuery()
                ->getSingleScalarResult();

            if ($rapidAttempts >= 3) {
                $this->fraudMonitoringService->recordRapidWithdrawalAttempt($vendor, [
                    'rapid_attempts_last_10m' => $rapidAttempts,
                    'requested_amount_minor' => $amountMinor,
                ]);
            }

            $reference = sprintf('wd_%s_%d', bin2hex(random_bytes(5)), $vendor->getId());
            $withdrawal = new WithdrawalRequest($vendor, $reference, $amountMinor, $currency, $msisdn, $provider);

            $this->em->persist($withdrawal);
            $this->em->flush();

            return $withdrawal;
        });
    }

    public function approve(WithdrawalRequest $withdrawal, User $admin, string $callbackUrl): void
    {
        if (!in_array('ROLE_ADMIN', $admin->getRoles(), true)) {
            throw new UnauthorizedFinancialOperationException('Admin privileges required.');
        }

        $this->em->wrapInTransaction(function () use ($withdrawal): void {
            $this->em->lock($withdrawal, LockMode::PESSIMISTIC_WRITE);

            if ($withdrawal->getStatus() !== WithdrawalRequest::STATUS_REQUESTED) {
                throw new \RuntimeException('Withdrawal is not in REQUESTED state.');
            }

            $feeMinor = $this->platformFeeService->calculateWithdrawalFee($withdrawal->getAmountMinor());
            $withdrawal->approve($feeMinor);
            $this->vendorWalletService->reserveForWithdrawal($withdrawal, 'withdrawal_reserve_' . $withdrawal->getReference());
            $this->em->flush();
        });

        $fallbackPayoutReference = 'payout_' . $withdrawal->getReference();

        try {
            $response = $this->snippeClient->createPayout(
                reference: $withdrawal->getReference(),
                amountMinor: $withdrawal->getAmountMinor(),
                currency: $withdrawal->getCurrency(),
                msisdn: $withdrawal->getDestinationMsisdn(),
                provider: $withdrawal->getProvider(),
                callbackUrl: $callbackUrl,
                idempotencyKey: 'payout_send_' . $withdrawal->getReference(),
                recipientName: sprintf('Vendor %d', $withdrawal->getVendor()->getId())
            );

            $responseData = $response['data'] ?? null;
            $snippeReferenceRaw = is_array($responseData) ? ($responseData['reference'] ?? '') : '';
            $snippePayoutReference = is_scalar($snippeReferenceRaw) && (string) $snippeReferenceRaw !== ''
                ? (string) $snippeReferenceRaw
                : $fallbackPayoutReference;

            $this->em->wrapInTransaction(function () use ($withdrawal, $snippePayoutReference, $response): void {
                $this->em->lock($withdrawal, LockMode::PESSIMISTIC_WRITE);

                if ($withdrawal->getStatus() === WithdrawalRequest::STATUS_APPROVED) {
                    $withdrawal->markProcessing($snippePayoutReference, $response);
                    $this->em->flush();
                }
            });
        } catch (\Throwable $e) {
            $this->em->wrapInTransaction(function () use ($withdrawal, $e): void {
                $this->em->lock($withdrawal, LockMode::PESSIMISTIC_WRITE);

                if (in_array($withdrawal->getStatus(), [WithdrawalRequest::STATUS_APPROVED, WithdrawalRequest::STATUS_PROCESSING], true)) {
                    $withdrawal->markFailed('Payout initiation failed: ' . $e->getMessage(), ['error' => $e->getMessage()]);
                    $this->vendorWalletService->reverseFailedWithdrawal($withdrawal, 'withdrawal_reversal_' . $withdrawal->getReference());
                    $this->em->flush();
                }
            });

            throw $e;
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function handlePayoutWebhook(array $payload): void
    {
        $referenceRaw = $payload['reference'] ?? '';
        $statusRaw = $payload['status'] ?? '';
        $externalTransactionIdRaw = $payload['transaction_id'] ?? ($payload['id'] ?? '');

        $reference = is_scalar($referenceRaw) ? (string) $referenceRaw : '';
        $status = strtoupper(is_scalar($statusRaw) ? (string) $statusRaw : '');
        $externalTransactionId = is_scalar($externalTransactionIdRaw) ? (string) $externalTransactionIdRaw : '';

        if ($reference === '' || $status === '') {
            throw new \InvalidArgumentException('Payout webhook missing required fields.');
        }

        $this->em->wrapInTransaction(function () use ($reference, $status, $externalTransactionId, $payload): void {
            $withdrawal = $this->withdrawalRepository->findOneByPayoutReference($reference)
                ?? $this->withdrawalRepository->findOneByReference($reference);

            if ($withdrawal === null) {
                throw new \RuntimeException('Withdrawal reference not found for payout webhook.');
            }

            $this->em->lock($withdrawal, LockMode::PESSIMISTIC_WRITE);

            if ($status === 'SUCCESS') {
                if ($withdrawal->getStatus() === WithdrawalRequest::STATUS_PAID && $withdrawal->getExternalTransactionId() === $externalTransactionId) {
                    return;
                }

                $withdrawal->markPaid($externalTransactionId, $payload);
                $this->vendorWalletService->finalizeSuccessfulWithdrawal($withdrawal, 'withdrawal_paid_' . $withdrawal->getReference());
                $this->em->flush();

                return;
            }

            if ($withdrawal->getStatus() === WithdrawalRequest::STATUS_FAILED) {
                return;
            }

            $reasonRaw = $payload['reason'] ?? 'Payout failed';
            $reason = is_scalar($reasonRaw) ? (string) $reasonRaw : 'Payout failed';

            $withdrawal->markFailed($reason, $payload);
            $this->fraudMonitoringService->recordRapidWithdrawalAttempt($withdrawal->getVendor(), [
                'withdrawal_reference' => $withdrawal->getReference(),
                'failure_reason' => $reason,
            ]);
            $this->vendorWalletService->reverseFailedWithdrawal($withdrawal, 'withdrawal_failed_' . $withdrawal->getReference());
            $this->em->flush();
        });
    }
}
