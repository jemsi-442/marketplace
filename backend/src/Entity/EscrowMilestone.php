<?php

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
    private ?Escrow $escrow = null;

    #[ORM\Column(type: 'string', length: 255)]
    private string $title;

    #[ORM\Column(type: 'float')]
    private float $amount = 0.0;

    #[ORM\Column(type: 'boolean')]
    private bool $released = false;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getEscrow(): ?Escrow { return $this->escrow; }
    public function setEscrow(?Escrow $escrow): self { $this->escrow = $escrow; return $this; }

    public function getTitle(): string { return $this->title; }
    public function setTitle(string $title): self { $this->title = $title; return $this; }

    public function getAmount(): float { return $this->amount; }
    public function setAmount(float $amount): self { $this->amount = $amount; return $this; }

    public function isReleased(): bool { return $this->released; }
    public function setReleased(bool $released): self { $this->released = $released; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
