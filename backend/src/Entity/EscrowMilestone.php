<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
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

    #[ORM\Column(type: 'decimal', precision: 12, scale: 2)]
    private float $amount;

    #[ORM\Column(type: 'string', length: 50)]
    private string $status = 'pending'; 
    // pending | completed | released | disputed

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $releasedAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getEscrow(): Escrow { return $this->escrow; }
    public function setEscrow(Escrow $escrow): void { $this->escrow = $escrow; }

    public function getTitle(): string { return $this->title; }
    public function setTitle(string $title): void { $this->title = $title; }

    public function getAmount(): float { return (float)$this->amount; }
    public function setAmount(float $amount): void { $this->amount = $amount; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): void { $this->status = $status; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function getReleasedAt(): ?\DateTimeImmutable { return $this->releasedAt; }
    public function setReleasedAt(?\DateTimeImmutable $releasedAt): void
    {
        $this->releasedAt = $releasedAt;
    }
}
