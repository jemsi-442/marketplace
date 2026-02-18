<?php

namespace App\Entity;

use App\Repository\EscrowRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EscrowRepository::class)]
#[ORM\Table(name: 'escrow')]
class Escrow
{
    public const STATUS_HELD = 'held';
    public const STATUS_RELEASED = 'released';
    public const STATUS_REFUNDED = 'refunded';
    public const STATUS_DISPUTED = 'disputed';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    /*
     * Relationships
     */

    #[ORM\OneToOne(mappedBy: 'escrow', targetEntity: Booking::class)]
    private ?Booking $booking = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private User $client;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private User $vendor;

    /*
     * MONEY (minor units only)
     */

    #[ORM\Column(type: 'bigint')]
    private int $amountMinor;

    #[ORM\Column(type: 'string', length: 3)]
    private string $currency;

    /*
     * STATUS
     */

    #[ORM\Column(type: 'string', length: 20)]
    private string $status = self::STATUS_HELD;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $releasedAt = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $resolvedAt = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $disputedAt = null;

    #[ORM\Column(type: 'string', nullable: true)]
    private ?string $adminDecision = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $disputeReason = null;

    /*
     * INVERSE RELATIONS (FIXING YOUR ERRORS)
     */

    #[ORM\OneToMany(mappedBy: 'escrow', targetEntity: PartialRelease::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $partialReleases;

    #[ORM\OneToMany(mappedBy: 'escrow', targetEntity: EscrowMilestone::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $milestones;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->partialReleases = new ArrayCollection();
        $this->milestones = new ArrayCollection();
    }

    /*
     * BASIC GETTERS
     */

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setAmount(int $amountMinor, string $currency): self
    {
        if ($amountMinor <= 0) {
            throw new \LogicException('Escrow amount must be greater than zero.');
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

    public function getPartialReleases(): Collection
    {
        return $this->partialReleases;
    }

    public function getMilestones(): Collection
    {
        return $this->milestones;
    }
}


