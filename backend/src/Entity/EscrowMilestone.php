<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'escrow_milestone')]
class EscrowMilestone
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Escrow::class, inversedBy: 'milestones')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Escrow $escrow;

    #[ORM\Column(type: 'string', length: 255)]
    private string $title;

    #[ORM\Column(type: 'bigint')]
    private int $amountMinor = 0;

    #[ORM\Column(type: 'boolean')]
    private bool $released = false;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

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

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): self
    {
        $this->title = $title;

        return $this;
    }

    public function getAmountMinor(): int
    {
        return $this->amountMinor;
    }

    public function setAmountMinor(int $amountMinor): self
    {
        if ($amountMinor < 0) {
            throw new \InvalidArgumentException('Milestone amount minor must be zero or positive.');
        }

        $this->amountMinor = $amountMinor;

        return $this;
    }

    /**
     * Temporary compatibility wrapper for legacy callers using major units.
     */
    public function getAmount(): float
    {
        return $this->amountMinor / 100;
    }

    /**
     * Temporary compatibility wrapper for legacy callers using major units.
     */
    public function setAmount(float $amount): self
    {
        return $this->setAmountMinor((int) round($amount * 100));
    }

    public function isReleased(): bool
    {
        return $this->released;
    }

    public function setReleased(bool $released): self
    {
        $this->released = $released;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
