<?php

declare(strict_types=1);

namespace App\Service;

class PlatformFeeService
{
    public function __construct(private readonly int $feeBps = 1000)
    {
    }

    public function calculateEscrowFee(int $grossMinor): int
    {
        if ($grossMinor <= 0) {
            throw new \InvalidArgumentException('Gross amount must be positive.');
        }

        return (int) floor(($grossMinor * $this->feeBps) / 10000);
    }

    public function calculateWithdrawalFee(int $amountMinor, int $feeBps = 250): int
    {
        if ($amountMinor <= 0) {
            throw new \InvalidArgumentException('Withdrawal amount must be positive.');
        }

        return (int) floor(($amountMinor * $feeBps) / 10000);
    }
}
