<?php

declare(strict_types=1);

namespace App\Domain;

use App\Exception\Domain\CurrencyMismatchException;
use App\Exception\Domain\InvalidMoneyOperationException;

final class Money
{
    private function __construct(
        private readonly int $amountMinor,
        private readonly string $currency
    ) {
    }

    public static function fromMinor(int $amountMinor, string $currency): self
    {
        if ($amountMinor < 0) {
            throw new InvalidMoneyOperationException('Amount must be zero or positive.');
        }

        $normalizedCurrency = strtoupper(trim($currency));
        if (strlen($normalizedCurrency) !== 3) {
            throw new InvalidMoneyOperationException('Currency must be a 3-letter ISO code.');
        }

        return new self($amountMinor, $normalizedCurrency);
    }

    public static function zero(string $currency): self
    {
        return self::fromMinor(0, $currency);
    }

    public function amountMinor(): int
    {
        return $this->amountMinor;
    }

    public function currency(): string
    {
        return $this->currency;
    }

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self($this->amountMinor + $other->amountMinor, $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);

        if ($other->amountMinor > $this->amountMinor) {
            throw new InvalidMoneyOperationException('Result cannot be negative.');
        }

        return new self($this->amountMinor - $other->amountMinor, $this->currency);
    }

    public function isPositive(): bool
    {
        return $this->amountMinor > 0;
    }

    private function assertSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new CurrencyMismatchException(sprintf('Currency mismatch: %s vs %s.', $this->currency, $other->currency));
        }
    }
}
