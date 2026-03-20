<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Wallet;

class WalletService
{
    public function __construct(private readonly VendorWalletService $vendorWalletService)
    {
    }

    public function credit(
        Wallet $wallet,
        int $amountMinor,
        string $referenceType,
        ?int $referenceId = null
    ): void {
        $this->vendorWalletService->manualCreditVendor(
            vendor: $wallet->getVendor(),
            amountMinor: $amountMinor,
            currency: $wallet->getCurrency(),
            reference: $this->buildReference($referenceType, $referenceId),
            idempotencyKey: $this->buildIdempotencyKey('credit', $wallet, $referenceType, $referenceId),
            metadata: [
                'legacy_wallet_id' => $wallet->getId(),
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
            ]
        );
    }

    public function debit(
        Wallet $wallet,
        int $amountMinor,
        string $referenceType,
        ?int $referenceId = null
    ): void {
        $this->vendorWalletService->manualDebitVendor(
            vendor: $wallet->getVendor(),
            amountMinor: $amountMinor,
            currency: $wallet->getCurrency(),
            reference: $this->buildReference($referenceType, $referenceId),
            idempotencyKey: $this->buildIdempotencyKey('debit', $wallet, $referenceType, $referenceId),
            metadata: [
                'legacy_wallet_id' => $wallet->getId(),
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
            ]
        );
    }

    public function balance(Wallet $wallet): int
    {
        return $this->vendorWalletService->getVendorBalance($wallet->getVendor(), $wallet->getCurrency());
    }

    private function buildReference(string $referenceType, ?int $referenceId): string
    {
        return $referenceId !== null
            ? sprintf('legacy_%s_%d', strtolower($referenceType), $referenceId)
            : sprintf('legacy_%s', strtolower($referenceType));
    }

    private function buildIdempotencyKey(string $operation, Wallet $wallet, string $referenceType, ?int $referenceId): string
    {
        $walletId = $wallet->getId() ?? 0;

        return $referenceId !== null
            ? sprintf('legacy_wallet_%s_%d_%s_%d', $operation, $walletId, strtolower($referenceType), $referenceId)
            : sprintf('legacy_wallet_%s_%d_%s', $operation, $walletId, strtolower($referenceType));
    }
}
