<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'wallet_ledger')]
class WalletLedgerEntry
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Wallet::class)]
    #[ORM\JoinColumn(nullable: false)]
    private Wallet $wallet;

    #[ORM\Column(type: 'bigint')]
    private int $amountMinor;

    #[ORM\Column(type: 'string', length: 10)]
    private string $type; 
    // CREDIT or DEBIT

    #[ORM\Column(type: 'string', length: 50)]
    private string $referenceType;
    // ESCROW_RELEASE, REFUND, WITHDRAWAL, ADJUSTMENT

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $referenceId = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    public function __construct(
        Wallet $wallet,
        int $amountMinor,
        string $type,
        string $referenceType,
        ?int $referenceId = null
    ) {
        $this->wallet = $wallet;
        $this->amountMinor = $amountMinor;
        $this->type = $type;
        $this->referenceType = $referenceType;
        $this->referenceId = $referenceId;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getAmountSigned(): int
    {
        return $this->type === 'CREDIT'
            ? $this->amountMinor
            : -$this->amountMinor;
    }
}
