<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'escrow_audit_logs')]
class EscrowAuditLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Escrow::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Escrow $escrow;

    #[ORM\Column(length: 50)]
    private string $action;

    #[ORM\Column(type: 'json')]
    private array $metadata = [];

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?User $actor = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        Escrow $escrow,
        string $action,
        ?User $actor = null,
        array $metadata = []
    ) {
        $this->escrow = $escrow;
        $this->action = $action;
        $this->actor = $actor;
        $this->metadata = $metadata;
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

    public function getAction(): string
    {
        return $this->action;
    }

    public function getMetadata(): array
    {
        return $this->metadata;
    }

    public function getActor(): ?User
    {
        return $this->actor;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
