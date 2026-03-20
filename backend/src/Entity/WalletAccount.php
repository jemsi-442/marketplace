<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'wallet_account')]
#[ORM\UniqueConstraint(name: 'uniq_wallet_account_code', columns: ['account_code'])]
#[ORM\UniqueConstraint(name: 'uniq_wallet_owner_currency', columns: ['user_id', 'account_type', 'currency'])]
class WalletAccount
{
    public const TYPE_VENDOR = 'VENDOR';
    public const TYPE_PLATFORM_REVENUE = 'PLATFORM_REVENUE';
    public const TYPE_ESCROW_LIABILITY = 'ESCROW_LIABILITY';
    public const TYPE_WITHDRAWAL_CLEARING = 'WITHDRAWAL_CLEARING';
    public const TYPE_SNIPPE_SETTLEMENT = 'SNIPPE_SETTLEMENT';
    public const TYPE_LEGACY_ADJUSTMENT = 'LEGACY_ADJUSTMENT';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(name: 'account_type', type: 'string', length: 40)]
    private string $type;

    #[ORM\Column(name: 'account_code', type: 'string', length: 80)]
    private string $accountCode;

    #[ORM\Column(type: 'string', length: 3)]
    private string $currency;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $type, string $accountCode, string $currency, ?User $user = null)
    {
        $this->type = $type;
        $this->accountCode = strtoupper(trim($accountCode));
        $this->currency = strtoupper(trim($currency));
        $this->user = $user;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getAccountCode(): string
    {
        return $this->accountCode;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }
}
