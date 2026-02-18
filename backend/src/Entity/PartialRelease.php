<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'partial_release')]
class PartialRelease
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Escrow::class, inversedBy: 'partialReleases')]
    #[ORM\JoinColumn(nullable: false)]
    private Escrow $escrow;

    #[ORM\Column(type: 'string', length: 255)]
    private string $milestone;

    // MONEY IN MINOR UNITS
    #[ORM\Column(type: 'bigint')]
    private int $amountMinor;

    #[ORM\Column(type: 'string', length: 3)]
    private string $currency;

    #[ORM\Column(type: 'boolean')]
    private bool $released = false;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEscrow(): Escrow
    {
        return $this->escrow;
    }

    public function setEscrow(Escrow $escrow): self
    {
        $this->escrow = $escrow;
        return $this;
    }

    public function setAmount(int $amountMinor, string $currency): self
    {
        if ($amountMinor <= 0) {
            throw new \LogicException('Amount must be positive.');
        }

        $this->amountMinor = $amountMinor;
        $this->currency = strtoupper($currency);

        return $this;
    }

    public function getAmountMinor(): int
    {
        return $this->amountMinor;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function isReleased(): bool
    {
        return $this->released;
    }

    public function markReleased(): self
    {
        $this->released = true;
        return $this;
    }
}
