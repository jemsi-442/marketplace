<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class MilestoneDispute
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: EscrowMilestone::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private EscrowMilestone $milestone;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private User $openedBy;

    #[ORM\Column(type: 'text')]
    private string $reason;

    #[ORM\Column(type: 'string', length: 50)]
    private string $status = 'open'; 
    // open | resolved_release | resolved_refund | rejected

    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    private ?string $adminDecision = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $resolvedAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getMilestone(): EscrowMilestone { return $this->milestone; }
    public function setMilestone(EscrowMilestone $milestone): void { $this->milestone = $milestone; }

    public function getOpenedBy(): User { return $this->openedBy; }
    public function setOpenedBy(User $user): void { $this->openedBy = $user; }

    public function getReason(): string { return $this->reason; }
    public function setReason(string $reason): void { $this->reason = $reason; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): void { $this->status = $status; }

    public function getAdminDecision(): ?string { return $this->adminDecision; }
    public function setAdminDecision(?string $decision): void { $this->adminDecision = $decision; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function getResolvedAt(): ?\DateTimeImmutable { return $this->resolvedAt; }
    public function setResolvedAt(?\DateTimeImmutable $date): void
    {
        $this->resolvedAt = $date;
    }
}
