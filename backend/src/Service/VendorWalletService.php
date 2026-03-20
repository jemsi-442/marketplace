<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Escrow;
use App\Entity\User;
use App\Entity\WalletAccount;
use App\Entity\WalletLedgerEntry;
use App\Entity\WithdrawalRequest;
use App\Exception\Domain\CurrencyMismatchException;
use App\Exception\Domain\IdempotencyConflictException;
use App\Exception\Domain\InsufficientFundsException;
use App\Repository\WalletLedgerRepository;
use App\Repository\WalletRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;

class VendorWalletService
{
    public const PLATFORM_REVENUE_CODE = 'PLATFORM_REVENUE';
    public const ESCROW_LIABILITY_CODE = 'ESCROW_LIABILITY';
    public const WITHDRAWAL_CLEARING_CODE = 'WITHDRAWAL_CLEARING';
    public const SNIPPE_SETTLEMENT_CODE = 'SNIPPE_SETTLEMENT';
    public const LEGACY_ADJUSTMENT_CODE = 'LEGACY_ADJUSTMENT';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly WalletRepository $walletRepository,
        private readonly WalletLedgerRepository $walletLedgerRepository
    ) {
    }

    public function getVendorBalance(User $vendor, string $currency): int
    {
        $account = $this->requireVendorAccount($vendor, $currency);

        return $this->walletLedgerRepository->calculateBalance($account);
    }

    public function recordEscrowFunding(Escrow $escrow, string $idempotencyKey): void
    {
        $currency = $escrow->getCurrency();
        $amountMinor = $escrow->getAmountMinor();

        $this->postDoubleEntry(
            debitAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_SNIPPE_SETTLEMENT, self::SNIPPE_SETTLEMENT_CODE, $currency),
            creditAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_ESCROW_LIABILITY, self::ESCROW_LIABILITY_CODE, $currency),
            amountMinor: $amountMinor,
            currency: $currency,
            reference: $escrow->getReference(),
            idempotencyKey: $idempotencyKey,
            metadata: ['movement' => 'ESCROW_FUNDING', 'escrow_reference' => $escrow->getReference()]
        );
    }

    public function releaseEscrowToVendor(Escrow $escrow, int $platformFeeMinor, string $idempotencyPrefix): void
    {
        $currency = $escrow->getCurrency();
        $gross = $escrow->getAmountMinor();
        $vendorNet = $gross - $platformFeeMinor;

        if ($vendorNet <= 0) {
            throw new \InvalidArgumentException('Escrow net amount must be positive.');
        }

        $this->postDoubleEntry(
            debitAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_ESCROW_LIABILITY, self::ESCROW_LIABILITY_CODE, $currency),
            creditAccountProvider: fn (): WalletAccount => $this->requireVendorAccount($escrow->getVendor(), $currency),
            amountMinor: $vendorNet,
            currency: $currency,
            reference: $escrow->getReference(),
            idempotencyKey: $idempotencyPrefix . '_vendor_net',
            metadata: ['movement' => 'ESCROW_RELEASE_VENDOR_NET', 'escrow_reference' => $escrow->getReference()]
        );

        if ($platformFeeMinor > 0) {
            $this->postDoubleEntry(
                debitAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_ESCROW_LIABILITY, self::ESCROW_LIABILITY_CODE, $currency),
                creditAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_PLATFORM_REVENUE, self::PLATFORM_REVENUE_CODE, $currency),
                amountMinor: $platformFeeMinor,
                currency: $currency,
                reference: $escrow->getReference(),
                idempotencyKey: $idempotencyPrefix . '_platform_fee',
                metadata: ['movement' => 'ESCROW_RELEASE_PLATFORM_FEE', 'escrow_reference' => $escrow->getReference()]
            );
        }
    }

    public function refundEscrowExternally(Escrow $escrow, string $idempotencyKey): void
    {
        $currency = $escrow->getCurrency();

        $this->postDoubleEntry(
            debitAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_ESCROW_LIABILITY, self::ESCROW_LIABILITY_CODE, $currency),
            creditAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_SNIPPE_SETTLEMENT, self::SNIPPE_SETTLEMENT_CODE, $currency),
            amountMinor: $escrow->getAmountMinor(),
            currency: $currency,
            reference: $escrow->getReference(),
            idempotencyKey: $idempotencyKey,
            metadata: ['movement' => 'ESCROW_REFUND_EXTERNAL', 'escrow_reference' => $escrow->getReference()]
        );
    }

    public function reserveForWithdrawal(WithdrawalRequest $withdrawal, string $idempotencyPrefix): void
    {
        $currency = $withdrawal->getCurrency();

        $this->postDoubleEntry(
            debitAccountProvider: fn (): WalletAccount => $this->requireVendorAccount($withdrawal->getVendor(), $currency),
            creditAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_WITHDRAWAL_CLEARING, self::WITHDRAWAL_CLEARING_CODE, $currency),
            amountMinor: $withdrawal->getAmountMinor(),
            currency: $currency,
            reference: $withdrawal->getReference(),
            idempotencyKey: $idempotencyPrefix . '_withdrawal_amount',
            metadata: ['movement' => 'WITHDRAWAL_RESERVE', 'withdrawal_reference' => $withdrawal->getReference()]
        );

        if ($withdrawal->getFeeMinor() > 0) {
            $this->postDoubleEntry(
                debitAccountProvider: fn (): WalletAccount => $this->requireVendorAccount($withdrawal->getVendor(), $currency),
                creditAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_PLATFORM_REVENUE, self::PLATFORM_REVENUE_CODE, $currency),
                amountMinor: $withdrawal->getFeeMinor(),
                currency: $currency,
                reference: $withdrawal->getReference(),
                idempotencyKey: $idempotencyPrefix . '_withdrawal_fee',
                metadata: ['movement' => 'WITHDRAWAL_FEE', 'withdrawal_reference' => $withdrawal->getReference()]
            );
        }
    }

    public function finalizeSuccessfulWithdrawal(WithdrawalRequest $withdrawal, string $idempotencyKey): void
    {
        $currency = $withdrawal->getCurrency();

        $this->postDoubleEntry(
            debitAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_WITHDRAWAL_CLEARING, self::WITHDRAWAL_CLEARING_CODE, $currency),
            creditAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_SNIPPE_SETTLEMENT, self::SNIPPE_SETTLEMENT_CODE, $currency),
            amountMinor: $withdrawal->getAmountMinor(),
            currency: $currency,
            reference: $withdrawal->getReference(),
            idempotencyKey: $idempotencyKey,
            metadata: ['movement' => 'WITHDRAWAL_PAID', 'withdrawal_reference' => $withdrawal->getReference()]
        );
    }

    public function reverseFailedWithdrawal(WithdrawalRequest $withdrawal, string $idempotencyPrefix): void
    {
        $currency = $withdrawal->getCurrency();

        $this->postDoubleEntry(
            debitAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_WITHDRAWAL_CLEARING, self::WITHDRAWAL_CLEARING_CODE, $currency),
            creditAccountProvider: fn (): WalletAccount => $this->requireVendorAccount($withdrawal->getVendor(), $currency),
            amountMinor: $withdrawal->getAmountMinor(),
            currency: $currency,
            reference: $withdrawal->getReference(),
            idempotencyKey: $idempotencyPrefix . '_withdrawal_amount_reversal',
            metadata: ['movement' => 'WITHDRAWAL_REVERSE', 'withdrawal_reference' => $withdrawal->getReference()]
        );

        if ($withdrawal->getFeeMinor() > 0) {
            $this->postDoubleEntry(
                debitAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_PLATFORM_REVENUE, self::PLATFORM_REVENUE_CODE, $currency),
                creditAccountProvider: fn (): WalletAccount => $this->requireVendorAccount($withdrawal->getVendor(), $currency),
                amountMinor: $withdrawal->getFeeMinor(),
                currency: $currency,
                reference: $withdrawal->getReference(),
                idempotencyKey: $idempotencyPrefix . '_withdrawal_fee_reversal',
                metadata: ['movement' => 'WITHDRAWAL_FEE_REVERSE', 'withdrawal_reference' => $withdrawal->getReference()]
            );
        }
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function manualCreditVendor(
        User $vendor,
        int $amountMinor,
        string $currency,
        string $reference,
        string $idempotencyKey,
        array $metadata = []
    ): void {
        $this->postDoubleEntry(
            debitAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_LEGACY_ADJUSTMENT, self::LEGACY_ADJUSTMENT_CODE, $currency),
            creditAccountProvider: fn (): WalletAccount => $this->requireVendorAccount($vendor, $currency),
            amountMinor: $amountMinor,
            currency: $currency,
            reference: $reference,
            idempotencyKey: $idempotencyKey,
            metadata: array_merge([
                'movement' => 'LEGACY_WALLET_MANUAL_CREDIT',
            ], $metadata)
        );
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function manualDebitVendor(
        User $vendor,
        int $amountMinor,
        string $currency,
        string $reference,
        string $idempotencyKey,
        array $metadata = []
    ): void {
        $this->postDoubleEntry(
            debitAccountProvider: fn (): WalletAccount => $this->requireVendorAccount($vendor, $currency),
            creditAccountProvider: fn (): WalletAccount => $this->requireSystemAccount(WalletAccount::TYPE_LEGACY_ADJUSTMENT, self::LEGACY_ADJUSTMENT_CODE, $currency),
            amountMinor: $amountMinor,
            currency: $currency,
            reference: $reference,
            idempotencyKey: $idempotencyKey,
            metadata: array_merge([
                'movement' => 'LEGACY_WALLET_MANUAL_DEBIT',
            ], $metadata)
        );
    }

    private function requireVendorAccount(User $vendor, string $currency): WalletAccount
    {
        $account = $this->walletRepository->findVendorAccount($vendor, $currency);
        if ($account !== null) {
            return $account;
        }

        $code = sprintf('VENDOR_%d_%s', $vendor->getId(), strtoupper($currency));
        $this->walletRepository->ensureAccountExists($vendor->getId(), WalletAccount::TYPE_VENDOR, $code, $currency);

        $account = $this->walletRepository->findVendorAccount($vendor, $currency);
        if ($account === null) {
            throw new \RuntimeException('Failed to provision vendor wallet account.');
        }

        return $account;
    }

    private function requireSystemAccount(string $type, string $code, string $currency): WalletAccount
    {
        $accountCode = $code . '_' . strtoupper($currency);
        $account = $this->walletRepository->findByCode($accountCode);
        if ($account !== null) {
            return $account;
        }

        $this->walletRepository->ensureAccountExists(null, $type, $accountCode, $currency);
        $account = $this->walletRepository->findByCode($accountCode);
        if ($account === null) {
            throw new \RuntimeException('Failed to provision system wallet account.');
        }

        return $account;
    }

    /**
     * @param array<string, mixed> $metadata
     */
    private function postDoubleEntry(
        callable $debitAccountProvider,
        callable $creditAccountProvider,
        int $amountMinor,
        string $currency,
        string $reference,
        string $idempotencyKey,
        array $metadata
    ): void {
        $this->em->wrapInTransaction(function () use ($debitAccountProvider, $creditAccountProvider, $amountMinor, $currency, $reference, $idempotencyKey, $metadata): void {
            /** @var WalletAccount $debitAccount */
            $debitAccount = $debitAccountProvider();
            /** @var WalletAccount $creditAccount */
            $creditAccount = $creditAccountProvider();

            if ($debitAccount->getCurrency() !== strtoupper($currency) || $creditAccount->getCurrency() !== strtoupper($currency)) {
                throw new CurrencyMismatchException('Wallet account currency mismatch.');
            }

            $existing = $this->walletLedgerRepository->findOneByIdempotencyKey($idempotencyKey);
            if ($existing !== null) {
                $mirror = $this->walletLedgerRepository->findOneByIdempotencyKey($idempotencyKey . '_mirror');
                if ($mirror === null) {
                    throw new IdempotencyConflictException(sprintf('Ledger idempotency key exists but mirror missing: %s', $idempotencyKey));
                }

                $this->assertIdempotentPairMatches(
                    existingDebit: $existing,
                    existingCredit: $mirror,
                    expectedDebit: $debitAccount,
                    expectedCredit: $creditAccount,
                    amountMinor: $amountMinor,
                    currency: $currency,
                    reference: $reference,
                    metadata: $metadata,
                    idempotencyKey: $idempotencyKey
                );

                return; // Idempotent replay: no-op
            }

            // Should never happen (atomic transaction), but if it does we want to surface it loudly.
            if ($this->walletLedgerRepository->findOneByIdempotencyKey($idempotencyKey . '_mirror') !== null) {
                throw new IdempotencyConflictException(sprintf('Ledger mirror exists without canonical entry: %s', $idempotencyKey));
            }

            $this->em->lock($debitAccount, LockMode::PESSIMISTIC_WRITE);
            $this->em->lock($creditAccount, LockMode::PESSIMISTIC_WRITE);

            $available = $this->walletLedgerRepository->calculateBalance($debitAccount);
            if ($debitAccount->getType() === WalletAccount::TYPE_VENDOR && $available < $amountMinor) {
                throw new InsufficientFundsException('Insufficient vendor wallet balance.');
            }

            $this->em->persist(new WalletLedgerEntry(
                account: $debitAccount,
                amountMinor: $amountMinor,
                currency: $currency,
                entryType: WalletLedgerEntry::ENTRY_DEBIT,
                reference: $reference,
                counterAccount: $creditAccount,
                idempotencyKey: $idempotencyKey,
                metadata: $metadata
            ));

            $this->em->persist(new WalletLedgerEntry(
                account: $creditAccount,
                amountMinor: $amountMinor,
                currency: $currency,
                entryType: WalletLedgerEntry::ENTRY_CREDIT,
                reference: $reference,
                counterAccount: $debitAccount,
                idempotencyKey: $idempotencyKey . '_mirror',
                metadata: $metadata
            ));

            $this->em->flush();
        });
    }

    /**
     * @param array<string, mixed> $metadata
     */
    private function assertIdempotentPairMatches(
        WalletLedgerEntry $existingDebit,
        WalletLedgerEntry $existingCredit,
        WalletAccount $expectedDebit,
        WalletAccount $expectedCredit,
        int $amountMinor,
        string $currency,
        string $reference,
        array $metadata,
        string $idempotencyKey
    ): void {
        $expectedCurrency = strtoupper($currency);
        $movement = $metadata['movement'] ?? null;
        $expectedMovement = is_string($movement) ? $movement : null;

        $this->assertEntryMatches(
            entry: $existingDebit,
            expectedAccount: $expectedDebit,
            expectedCounterAccount: $expectedCredit,
            amountMinor: $amountMinor,
            currency: $expectedCurrency,
            reference: $reference,
            entryType: WalletLedgerEntry::ENTRY_DEBIT,
            idempotencyKey: $idempotencyKey,
            expectedMovement: $expectedMovement
        );

        $this->assertEntryMatches(
            entry: $existingCredit,
            expectedAccount: $expectedCredit,
            expectedCounterAccount: $expectedDebit,
            amountMinor: $amountMinor,
            currency: $expectedCurrency,
            reference: $reference,
            entryType: WalletLedgerEntry::ENTRY_CREDIT,
            idempotencyKey: $idempotencyKey . '_mirror',
            expectedMovement: $expectedMovement
        );
    }

    private function assertEntryMatches(
        WalletLedgerEntry $entry,
        WalletAccount $expectedAccount,
        WalletAccount $expectedCounterAccount,
        int $amountMinor,
        string $currency,
        string $reference,
        string $entryType,
        string $idempotencyKey,
        ?string $expectedMovement
    ): void {
        if ($entry->getEntryType() !== $entryType) {
            throw new IdempotencyConflictException(sprintf('Ledger idempotency key %s entryType mismatch.', $idempotencyKey));
        }

        if ($entry->getCurrency() !== $currency) {
            throw new IdempotencyConflictException(sprintf('Ledger idempotency key %s currency mismatch.', $idempotencyKey));
        }

        if ($entry->getAmountMinor() !== $amountMinor) {
            throw new IdempotencyConflictException(sprintf('Ledger idempotency key %s amount mismatch.', $idempotencyKey));
        }

        if ($entry->getReference() !== $reference) {
            throw new IdempotencyConflictException(sprintf('Ledger idempotency key %s reference mismatch.', $idempotencyKey));
        }

        if ($entry->getAccount()->getId() !== $expectedAccount->getId()) {
            throw new IdempotencyConflictException(sprintf('Ledger idempotency key %s account mismatch.', $idempotencyKey));
        }

        $counterAccount = $entry->getCounterAccount();
        if (!$counterAccount instanceof WalletAccount || $counterAccount->getId() !== $expectedCounterAccount->getId()) {
            throw new IdempotencyConflictException(sprintf('Ledger idempotency key %s counterAccount mismatch.', $idempotencyKey));
        }

        if ($expectedMovement !== null) {
            $movement = $entry->getMetadata()['movement'] ?? null;
            if ($movement !== $expectedMovement) {
                throw new IdempotencyConflictException(sprintf('Ledger idempotency key %s movement mismatch.', $idempotencyKey));
            }
        }
    }
}
