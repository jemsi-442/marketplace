<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'wallet_ledger_entry')]
#[ORM\Index(name: 'idx_wallet_ledger_account_created', columns: ['account_id', 'created_at'])]
#[ORM\Index(name: 'idx_wallet_ledger_reference', columns: ['reference'])]
#[ORM\UniqueConstraint(name: 'uniq_wallet_ledger_idempotency_key', columns: ['idempotency_key'])]
class WalletLedgerEntry
{
    public const ENTRY_DEBIT = 'DEBIT';
    public const ENTRY_CREDIT = 'CREDIT';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: WalletAccount::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private WalletAccount $account;

    #[ORM\ManyToOne(targetEntity: WalletAccount::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?WalletAccount $counterAccount = null;

    #[ORM\Column(type: 'bigint')]
    private int $amountMinor;

    #[ORM\Column(type: 'string', length: 3)]
    private string $currency;

    #[ORM\Column(name: 'entry_type', type: 'string', length: 10)]
    private string $entryType;

    #[ORM\Column(type: 'string', length: 120)]
    private string $reference;

    #[ORM\Column(name: 'idempotency_key', type: 'string', length: 120, nullable: true)]
    private ?string $idempotencyKey = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $metadata = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        WalletAccount $account,
        int $amountMinor,
        string $currency,
        string $entryType,
        string $reference,
        ?WalletAccount $counterAccount = null,
        ?string $idempotencyKey = null,
        ?array $metadata = null
    ) {
        if ($amountMinor <= 0) {
            throw new \InvalidArgumentException('Ledger amount must be positive.');
        }

        if (!in_array($entryType, [self::ENTRY_DEBIT, self::ENTRY_CREDIT], true)) {
            throw new \InvalidArgumentException('Invalid ledger entry type.');
        }

        $this->account = $account;
        $this->amountMinor = $amountMinor;
        $this->currency = strtoupper($currency);
        $this->entryType = $entryType;
        $this->reference = $reference;
        $this->counterAccount = $counterAccount;
        $this->idempotencyKey = $idempotencyKey;
        $this->metadata = $metadata;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getReference(): string
    {
        return $this->reference;
    }

    public function getAccount(): WalletAccount
    {
        return $this->account;
    }

    public function getCounterAccount(): ?WalletAccount
    {
        return $this->counterAccount;
    }

    public function getAmountMinor(): int
    {
        return $this->amountMinor;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function getEntryType(): string
    {
        return $this->entryType;
    }

    public function getIdempotencyKey(): ?string
    {
        return $this->idempotencyKey;
    }

    public function getMetadata(): ?array
    {
        return $this->metadata;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getSignedAmountMinor(): int
    {
        return $this->entryType === self::ENTRY_CREDIT ? $this->amountMinor : -$this->amountMinor;
    }
}
