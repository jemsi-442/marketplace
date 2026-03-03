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

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly WalletRepository $walletRepository,
        private readonly WalletLedgerRepository $walletLedgerRepository
    ) {
    }

    public function getVendorBalance(User $vendor, string $currency): int
    {
        $account = $this->getOrCreateVendorAccount($vendor, $currency);

        return $this->walletLedgerRepository->calculateBalance($account);
    }

    public function recordEscrowFunding(Escrow $escrow, string $idempotencyKey): void
    {
        $currency = $escrow->getCurrency();
        $amountMinor = $escrow->getAmountMinor();

        $this->postDoubleEntry(
            debitAccount: $this->getOrCreateSystemAccount(WalletAccount::TYPE_SNIPPE_SETTLEMENT, self::SNIPPE_SETTLEMENT_CODE, $currency),
            creditAccount: $this->getOrCreateSystemAccount(WalletAccount::TYPE_ESCROW_LIABILITY, self::ESCROW_LIABILITY_CODE, $currency),
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

        $escrowLiability = $this->getOrCreateSystemAccount(WalletAccount::TYPE_ESCROW_LIABILITY, self::ESCROW_LIABILITY_CODE, $currency);
        $vendorAccount = $this->getOrCreateVendorAccount($escrow->getVendor(), $currency);

        $this->postDoubleEntry(
            debitAccount: $escrowLiability,
            creditAccount: $vendorAccount,
            amountMinor: $vendorNet,
            currency: $currency,
            reference: $escrow->getReference(),
            idempotencyKey: $idempotencyPrefix . '_vendor_net',
            metadata: ['movement' => 'ESCROW_RELEASE_VENDOR_NET', 'escrow_reference' => $escrow->getReference()]
        );

        if ($platformFeeMinor > 0) {
            $platformRevenue = $this->getOrCreateSystemAccount(WalletAccount::TYPE_PLATFORM_REVENUE, self::PLATFORM_REVENUE_CODE, $currency);
            $this->postDoubleEntry(
                debitAccount: $escrowLiability,
                creditAccount: $platformRevenue,
                amountMinor: $platformFeeMinor,
                currency: $currency,
                reference: $escrow->getReference(),
                idempotencyKey: $idempotencyPrefix . '_platform_fee',
                metadata: ['movement' => 'ESCROW_RELEASE_PLATFORM_FEE', 'escrow_reference' => $escrow->getReference()]
            );
        }
    }

    public function reserveForWithdrawal(WithdrawalRequest $withdrawal, string $idempotencyPrefix): void
    {
        $currency = $withdrawal->getCurrency();
        $vendorAccount = $this->getOrCreateVendorAccount($withdrawal->getVendor(), $currency);
        $clearing = $this->getOrCreateSystemAccount(WalletAccount::TYPE_WITHDRAWAL_CLEARING, self::WITHDRAWAL_CLEARING_CODE, $currency);

        $this->postDoubleEntry(
            debitAccount: $vendorAccount,
            creditAccount: $clearing,
            amountMinor: $withdrawal->getAmountMinor(),
            currency: $currency,
            reference: $withdrawal->getReference(),
            idempotencyKey: $idempotencyPrefix . '_withdrawal_amount',
            metadata: ['movement' => 'WITHDRAWAL_RESERVE', 'withdrawal_reference' => $withdrawal->getReference()]
        );

        if ($withdrawal->getFeeMinor() > 0) {
            $platformRevenue = $this->getOrCreateSystemAccount(WalletAccount::TYPE_PLATFORM_REVENUE, self::PLATFORM_REVENUE_CODE, $currency);
            $this->postDoubleEntry(
                debitAccount: $vendorAccount,
                creditAccount: $platformRevenue,
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
        $clearing = $this->getOrCreateSystemAccount(WalletAccount::TYPE_WITHDRAWAL_CLEARING, self::WITHDRAWAL_CLEARING_CODE, $currency);
        $settlement = $this->getOrCreateSystemAccount(WalletAccount::TYPE_SNIPPE_SETTLEMENT, self::SNIPPE_SETTLEMENT_CODE, $currency);

        $this->postDoubleEntry(
            debitAccount: $clearing,
            creditAccount: $settlement,
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
        $vendorAccount = $this->getOrCreateVendorAccount($withdrawal->getVendor(), $currency);
        $clearing = $this->getOrCreateSystemAccount(WalletAccount::TYPE_WITHDRAWAL_CLEARING, self::WITHDRAWAL_CLEARING_CODE, $currency);

        $this->postDoubleEntry(
            debitAccount: $clearing,
            creditAccount: $vendorAccount,
            amountMinor: $withdrawal->getAmountMinor(),
            currency: $currency,
            reference: $withdrawal->getReference(),
            idempotencyKey: $idempotencyPrefix . '_withdrawal_amount_reversal',
            metadata: ['movement' => 'WITHDRAWAL_REVERSE', 'withdrawal_reference' => $withdrawal->getReference()]
        );

        if ($withdrawal->getFeeMinor() > 0) {
            $platformRevenue = $this->getOrCreateSystemAccount(WalletAccount::TYPE_PLATFORM_REVENUE, self::PLATFORM_REVENUE_CODE, $currency);
            $this->postDoubleEntry(
                debitAccount: $platformRevenue,
                creditAccount: $vendorAccount,
                amountMinor: $withdrawal->getFeeMinor(),
                currency: $currency,
                reference: $withdrawal->getReference(),
                idempotencyKey: $idempotencyPrefix . '_withdrawal_fee_reversal',
                metadata: ['movement' => 'WITHDRAWAL_FEE_REVERSE', 'withdrawal_reference' => $withdrawal->getReference()]
            );
        }
    }

    private function getOrCreateVendorAccount(User $vendor, string $currency): WalletAccount
    {
        $account = $this->walletRepository->findVendorAccount($vendor, $currency);
        if ($account !== null) {
            return $account;
        }

        $account = new WalletAccount(
            type: WalletAccount::TYPE_VENDOR,
            accountCode: sprintf('VENDOR_%d_%s', $vendor->getId(), strtoupper($currency)),
            currency: $currency,
            user: $vendor
        );

        $this->em->persist($account);
        $this->em->flush();

        return $account;
    }

    private function getOrCreateSystemAccount(string $type, string $code, string $currency): WalletAccount
    {
        $account = $this->walletRepository->findByCode($code . '_' . strtoupper($currency));
        if ($account !== null) {
            return $account;
        }

        $account = new WalletAccount(
            type: $type,
            accountCode: $code . '_' . strtoupper($currency),
            currency: $currency
        );

        $this->em->persist($account);
        $this->em->flush();

        return $account;
    }

    private function postDoubleEntry(
        WalletAccount $debitAccount,
        WalletAccount $creditAccount,
        int $amountMinor,
        string $currency,
        string $reference,
        string $idempotencyKey,
        array $metadata
    ): void {
        if ($debitAccount->getCurrency() !== strtoupper($currency) || $creditAccount->getCurrency() !== strtoupper($currency)) {
            throw new CurrencyMismatchException('Wallet account currency mismatch.');
        }

        $this->em->wrapInTransaction(function () use ($debitAccount, $creditAccount, $amountMinor, $currency, $reference, $idempotencyKey, $metadata): void {
            if ($this->walletLedgerRepository->hasIdempotencyKey($idempotencyKey)) {
                throw new IdempotencyConflictException(sprintf('Ledger idempotency key already processed: %s', $idempotencyKey));
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
}
