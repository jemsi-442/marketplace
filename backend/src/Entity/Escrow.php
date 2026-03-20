<?php

declare(strict_types=1);

namespace App\Entity;

use App\Exception\Domain\InvalidStateTransitionException;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'escrow')]
#[ORM\UniqueConstraint(name: 'uniq_escrow_reference', columns: ['reference'])]
#[ORM\UniqueConstraint(name: 'uniq_escrow_external_txn', columns: ['external_transaction_id'])]
class Escrow
{
    public const STATUS_CREATED = 'CREATED';
    public const STATUS_FUNDED = 'FUNDED';
    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_RELEASED = 'RELEASED';
    public const STATUS_DISPUTED = 'DISPUTED';
    public const STATUS_RESOLVED = 'RESOLVED';

    private const ALLOWED_TRANSITIONS = [
        self::STATUS_CREATED => [self::STATUS_FUNDED],
        self::STATUS_FUNDED => [self::STATUS_ACTIVE],
        self::STATUS_ACTIVE => [self::STATUS_RELEASED, self::STATUS_DISPUTED],
        self::STATUS_DISPUTED => [self::STATUS_RESOLVED],
        self::STATUS_RELEASED => [],
        self::STATUS_RESOLVED => [],
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 64)]
    private string $reference;

    #[ORM\OneToOne(mappedBy: 'escrow', targetEntity: Booking::class)]
    private ?Booking $booking = null;

    /**
     * @var Collection<int, PartialRelease>
     */
    #[ORM\OneToMany(mappedBy: 'escrow', targetEntity: PartialRelease::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $partialReleases;

    /**
     * @var Collection<int, EscrowMilestone>
     */
    #[ORM\OneToMany(mappedBy: 'escrow', targetEntity: EscrowMilestone::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $milestones;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private User $client;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private User $vendor;

    #[ORM\Column(type: 'bigint')]
    private int $amountMinor;

    #[ORM\Column(type: 'string', length: 3)]
    private string $currency;

    #[ORM\Column(type: 'string', length: 20)]
    private string $status = self::STATUS_CREATED;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $externalPaymentReference = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $externalTransactionId = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $externalStatusSnapshot = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $riskMetadata = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $fundedAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $activeAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $releasedAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $disputedAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $resolvedAt = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $reference, User $client, User $vendor, int $amountMinor, string $currency)
    {
        if ($amountMinor <= 0) {
            throw new \InvalidArgumentException('Escrow amount must be greater than zero.');
        }

        $this->reference = $reference;
        $this->client = $client;
        $this->vendor = $vendor;
        $this->amountMinor = $amountMinor;
        $this->currency = strtoupper($currency);
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
        $this->partialReleases = new ArrayCollection();
        $this->milestones = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getReference(): string
    {
        return $this->reference;
    }

    public function getBooking(): ?Booking
    {
        return $this->booking;
    }


    /**
     * @return Collection<int, PartialRelease>
     */
    public function getPartialReleases(): Collection
    {
        return $this->partialReleases;
    }

    /**
     * @return Collection<int, EscrowMilestone>
     */
    public function getMilestones(): Collection
    {
        return $this->milestones;
    }

    public function setBooking(?Booking $booking): self
    {
        $this->booking = $booking;

        if ($booking !== null && $booking->getEscrow() !== $this) {
            $booking->setEscrow($this);
        }

        return $this;
    }

    public function getClient(): User
    {
        return $this->client;
    }

    public function getVendor(): User
    {
        return $this->vendor;
    }

    public function getAmountMinor(): int
    {
        return $this->amountMinor;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function getExternalPaymentReference(): ?string
    {
        return $this->externalPaymentReference;
    }

    public function getExternalTransactionId(): ?string
    {
        return $this->externalTransactionId;
    }

    public function getExternalStatusSnapshot(): ?array
    {
        return $this->externalStatusSnapshot;
    }

    public function setRiskMetadata(?array $riskMetadata): self
    {
        $this->riskMetadata = $riskMetadata;
        $this->updatedAt = new \DateTimeImmutable();

        return $this;
    }

    public function getRiskMetadata(): ?array
    {
        return $this->riskMetadata;
    }

    public function transitionToFunded(string $externalPaymentReference, string $externalTransactionId, array $snapshot): void
    {
        $this->assertTransition(self::STATUS_FUNDED);
        $this->status = self::STATUS_FUNDED;
        $this->externalPaymentReference = $externalPaymentReference;
        $this->externalTransactionId = $externalTransactionId;
        $this->externalStatusSnapshot = $snapshot;
        $this->fundedAt = new \DateTimeImmutable();
        $this->updatedAt = $this->fundedAt;
    }

    public function setExternalPaymentReferenceForIntent(string $externalPaymentReference, array $snapshot = []): void
    {
        if ($this->status !== self::STATUS_CREATED) {
            throw new InvalidStateTransitionException('External payment reference can only be set while escrow is CREATED.');
        }

        if ($this->externalPaymentReference !== null && $this->externalPaymentReference !== $externalPaymentReference) {
            throw new \RuntimeException('External payment reference already set to a different value.');
        }

        $this->externalPaymentReference = $externalPaymentReference;
        $this->externalStatusSnapshot = $snapshot ?: $this->externalStatusSnapshot;
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function transitionToActive(): void
    {
        $this->assertTransition(self::STATUS_ACTIVE);
        $this->status = self::STATUS_ACTIVE;
        $this->activeAt = new \DateTimeImmutable();
        $this->updatedAt = $this->activeAt;
    }

    public function transitionToReleased(array $snapshot = []): void
    {
        $this->assertTransition(self::STATUS_RELEASED);
        $this->status = self::STATUS_RELEASED;
        $this->externalStatusSnapshot = $snapshot ?: $this->externalStatusSnapshot;
        $this->releasedAt = new \DateTimeImmutable();
        $this->updatedAt = $this->releasedAt;
    }

    public function transitionToDisputed(array $snapshot = []): void
    {
        $this->assertTransition(self::STATUS_DISPUTED);
        $this->status = self::STATUS_DISPUTED;
        $this->externalStatusSnapshot = $snapshot ?: $this->externalStatusSnapshot;
        $this->disputedAt = new \DateTimeImmutable();
        $this->updatedAt = $this->disputedAt;
    }

    public function transitionToResolved(array $snapshot = []): void
    {
        $this->assertTransition(self::STATUS_RESOLVED);
        $this->status = self::STATUS_RESOLVED;
        $this->externalStatusSnapshot = $snapshot ?: $this->externalStatusSnapshot;
        $this->resolvedAt = new \DateTimeImmutable();
        $this->updatedAt = $this->resolvedAt;
    }

    private function assertTransition(string $to): void
    {
        $allowed = self::ALLOWED_TRANSITIONS[$this->status] ?? [];
        if (!in_array($to, $allowed, true)) {
            throw new InvalidStateTransitionException(sprintf('Escrow transition %s -> %s is not allowed.', $this->status, $to));
        }
    }
}
