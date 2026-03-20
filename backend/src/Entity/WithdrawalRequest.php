<?php

declare(strict_types=1);

namespace App\Entity;

use App\Exception\Domain\InvalidStateTransitionException;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'withdrawal_request')]
#[ORM\UniqueConstraint(name: 'uniq_withdrawal_reference', columns: ['reference'])]
#[ORM\UniqueConstraint(name: 'uniq_withdrawal_payout_reference', columns: ['payout_reference'])]
#[ORM\UniqueConstraint(name: 'uniq_withdrawal_external_txn', columns: ['external_transaction_id'])]
class WithdrawalRequest
{
    public const STATUS_REQUESTED = 'REQUESTED';
    public const STATUS_APPROVED = 'APPROVED';
    public const STATUS_PROCESSING = 'PROCESSING';
    public const STATUS_PAID = 'PAID';
    public const STATUS_FAILED = 'FAILED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private User $vendor;

    #[ORM\Column(type: 'string', length: 64)]
    private string $reference;

    #[ORM\Column(name: 'payout_reference', type: 'string', length: 64, nullable: true)]
    private ?string $payoutReference = null;

    #[ORM\Column(name: 'external_transaction_id', type: 'string', length: 100, nullable: true)]
    private ?string $externalTransactionId = null;

    #[ORM\Column(type: 'bigint')]
    private int $amountMinor;

    #[ORM\Column(type: 'bigint')]
    private int $feeMinor = 0;

    #[ORM\Column(type: 'string', length: 3)]
    private string $currency;

    #[ORM\Column(type: 'string', length: 20)]
    private string $status = self::STATUS_REQUESTED;

    #[ORM\Column(type: 'string', length: 15)]
    private string $destinationMsisdn;

    #[ORM\Column(type: 'string', length: 40)]
    private string $provider;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $externalStatusSnapshot = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $failureReason = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $approvedAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $processingAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $completedAt = null;

    public function __construct(User $vendor, string $reference, int $amountMinor, string $currency, string $destinationMsisdn, string $provider)
    {
        if ($amountMinor <= 0) {
            throw new \InvalidArgumentException('Withdrawal amount must be positive.');
        }

        $this->vendor = $vendor;
        $this->reference = $reference;
        $this->amountMinor = $amountMinor;
        $this->currency = strtoupper($currency);
        $this->destinationMsisdn = $destinationMsisdn;
        $this->provider = strtoupper($provider);
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getVendor(): User
    {
        return $this->vendor;
    }

    public function getReference(): string
    {
        return $this->reference;
    }

    public function getPayoutReference(): ?string
    {
        return $this->payoutReference;
    }

    public function getExternalTransactionId(): ?string
    {
        return $this->externalTransactionId;
    }

    public function getAmountMinor(): int
    {
        return $this->amountMinor;
    }

    public function getFeeMinor(): int
    {
        return $this->feeMinor;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function getDestinationMsisdn(): string
    {
        return $this->destinationMsisdn;
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function getExternalStatusSnapshot(): ?array
    {
        return $this->externalStatusSnapshot;
    }

    public function getFailureReason(): ?string
    {
        return $this->failureReason;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getApprovedAt(): ?\DateTimeImmutable
    {
        return $this->approvedAt;
    }

    public function getProcessingAt(): ?\DateTimeImmutable
    {
        return $this->processingAt;
    }

    public function getCompletedAt(): ?\DateTimeImmutable
    {
        return $this->completedAt;
    }

    public function approve(int $feeMinor): void
    {
        $this->assertStatus(self::STATUS_REQUESTED);
        $this->status = self::STATUS_APPROVED;
        $this->feeMinor = $feeMinor;
        $this->approvedAt = new \DateTimeImmutable();
    }

    public function markProcessing(string $payoutReference, array $snapshot): void
    {
        $this->assertStatus(self::STATUS_APPROVED);
        $this->status = self::STATUS_PROCESSING;
        $this->payoutReference = $payoutReference;
        $this->externalStatusSnapshot = $snapshot;
        $this->processingAt = new \DateTimeImmutable();
    }

    public function markPaid(string $externalTransactionId, array $snapshot): void
    {
        if (!in_array($this->status, [self::STATUS_APPROVED, self::STATUS_PROCESSING], true)) {
            throw new InvalidStateTransitionException(sprintf('Withdrawal transition %s -> %s is not allowed.', $this->status, self::STATUS_PAID));
        }

        $this->status = self::STATUS_PAID;
        $this->externalTransactionId = $externalTransactionId;
        $this->externalStatusSnapshot = $snapshot;
        $this->completedAt = new \DateTimeImmutable();
    }

    public function markFailed(string $reason, array $snapshot): void
    {
        if (!in_array($this->status, [self::STATUS_APPROVED, self::STATUS_PROCESSING], true)) {
            throw new InvalidStateTransitionException(sprintf('Withdrawal transition %s -> %s is not allowed.', $this->status, self::STATUS_FAILED));
        }

        $this->status = self::STATUS_FAILED;
        $this->failureReason = $reason;
        $this->externalStatusSnapshot = $snapshot;
        $this->completedAt = new \DateTimeImmutable();
    }

    private function assertStatus(string $expected): void
    {
        if ($this->status !== $expected) {
            throw new InvalidStateTransitionException(sprintf('Expected status %s, got %s.', $expected, $this->status));
        }
    }
}
