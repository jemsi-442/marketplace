namespace App\Domain;

final class Money
{
    private function __construct(
        private int $amountMinor,
        private string $currency
    ) {}

    public static function fromMinor(int $amountMinor, string $currency): self
    {
        if ($amountMinor <= 0) {
            throw new \InvalidArgumentException('Amount must be greater than zero.');
        }

        return new self($amountMinor, strtoupper($currency));
    }

    public function getAmountMinor(): int
    {
        return $this->amountMinor;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self(
            $this->amountMinor + $other->amountMinor,
            $this->currency
        );
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);

        if ($other->amountMinor > $this->amountMinor) {
            throw new \LogicException('Insufficient funds.');
        }

        return new self(
            $this->amountMinor - $other->amountMinor,
            $this->currency
        );
    }

    private function assertSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new \LogicException('Currency mismatch.');
        }
    }
}
