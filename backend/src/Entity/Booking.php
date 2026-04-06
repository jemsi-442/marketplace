<?php

namespace App\Entity;

use App\Repository\BookingRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: BookingRepository::class)]
#[ORM\Table(name: 'booking')]
class Booking
{
    public const STATUS_PENDING   = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private User $client;

    #[ORM\ManyToOne(targetEntity: ClientRequest::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?ClientRequest $clientRequest = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $assignedVendor = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $agreedPriceMinor = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $servicePriceSnapshotMinor = null;

    #[ORM\Column(type: 'string', length: 10, nullable: true)]
    private ?string $currency = null;

    #[ORM\Column(type: 'string', length: 220, nullable: true)]
    private ?string $serviceTitleSnapshot = null;

    #[ORM\Column(type: 'string', length: 160, nullable: true)]
    private ?string $serviceCategorySnapshot = null;

    /*
     * Owning side of Escrow relation
     */
    #[ORM\OneToOne(inversedBy: 'booking', targetEntity: Escrow::class, cascade: ['persist', 'remove'])]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Escrow $escrow = null;

    #[ORM\Column(type: 'string', length: 50)]
    #[Assert\Choice([
        self::STATUS_PENDING,
        self::STATUS_CONFIRMED,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED
    ])]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(type: 'string', length: 220)]
    private string $requestSummary = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $scopeDetails = null;

    #[ORM\Column(type: 'string', length: 160, nullable: true)]
    private ?string $deadlineNote = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    /*
     * ======================
     * BASIC GETTERS
     * ======================
     */

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getClient(): User
    {
        return $this->client;
    }

    public function setClient(User $client): self
    {
        $this->client = $client;
        return $this;
    }

    public function getClientRequest(): ?ClientRequest
    {
        return $this->clientRequest;
    }

    public function setClientRequest(?ClientRequest $clientRequest): self
    {
        $this->clientRequest = $clientRequest;
        $this->touch();

        return $this;
    }

    public function getAssignedVendor(): ?User
    {
        return $this->assignedVendor;
    }

    public function setAssignedVendor(?User $assignedVendor): self
    {
        $this->assignedVendor = $assignedVendor;
        $this->touch();

        return $this;
    }

    public function getAgreedPriceMinor(): ?int
    {
        return $this->agreedPriceMinor;
    }

    public function setAgreedPriceMinor(?int $agreedPriceMinor): self
    {
        $this->agreedPriceMinor = $agreedPriceMinor;
        $this->touch();

        return $this;
    }

    public function getCurrency(): ?string
    {
        return $this->currency;
    }

    public function setCurrency(?string $currency): self
    {
        $this->currency = $currency !== null ? strtoupper(trim($currency)) : null;
        $this->touch();

        return $this;
    }

    public function getServicePriceSnapshotMinor(): ?int
    {
        return $this->servicePriceSnapshotMinor;
    }

    public function setServicePriceSnapshotMinor(?int $servicePriceSnapshotMinor): self
    {
        $this->servicePriceSnapshotMinor = $servicePriceSnapshotMinor;
        $this->touch();

        return $this;
    }

    public function getServiceTitleSnapshot(): ?string
    {
        return $this->serviceTitleSnapshot;
    }

    public function setServiceTitleSnapshot(?string $serviceTitleSnapshot): self
    {
        $this->serviceTitleSnapshot = $serviceTitleSnapshot !== null ? trim($serviceTitleSnapshot) : null;
        $this->touch();

        return $this;
    }

    public function getServiceCategorySnapshot(): ?string
    {
        return $this->serviceCategorySnapshot;
    }

    public function setServiceCategorySnapshot(?string $serviceCategorySnapshot): self
    {
        $this->serviceCategorySnapshot = $serviceCategorySnapshot !== null ? trim($serviceCategorySnapshot) : null;
        $this->touch();

        return $this;
    }

    public function getEscrow(): ?Escrow
    {
        return $this->escrow;
    }

    public function setEscrow(?Escrow $escrow): self
    {
        $this->escrow = $escrow;

        if ($escrow && $escrow->getBooking() !== $this) {
            $escrow->setBooking($this);
        }

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;
        $this->touch();
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getRequestSummary(): string
    {
        return $this->requestSummary;
    }

    public function setRequestSummary(string $requestSummary): self
    {
        $this->requestSummary = trim($requestSummary);
        $this->touch();

        return $this;
    }

    public function getScopeDetails(): ?string
    {
        return $this->scopeDetails;
    }

    public function setScopeDetails(?string $scopeDetails): self
    {
        $this->scopeDetails = $scopeDetails !== null ? trim($scopeDetails) : null;
        $this->touch();

        return $this;
    }

    public function getDeadlineNote(): ?string
    {
        return $this->deadlineNote;
    }

    public function setDeadlineNote(?string $deadlineNote): self
    {
        $this->deadlineNote = $deadlineNote !== null ? trim($deadlineNote) : null;
        $this->touch();

        return $this;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function resolveVendorUser(): ?User
    {
        if ($this->assignedVendor instanceof User) {
            return $this->assignedVendor;
        }

        return $this->clientRequest?->getSelectedVendor()?->getUser();
    }

    public function resolveChargeAmountMinor(): ?int
    {
        if ($this->agreedPriceMinor !== null) {
            return $this->agreedPriceMinor;
        }

        if ($this->servicePriceSnapshotMinor !== null) {
            return $this->servicePriceSnapshotMinor;
        }

        return null;
    }

    public function resolveCurrency(): string
    {
        return $this->currency ?? 'TZS';
    }

    public function resolveServiceTitle(): string
    {
        if ($this->serviceTitleSnapshot !== null && $this->serviceTitleSnapshot !== '') {
            return $this->serviceTitleSnapshot;
        }

        if ($this->clientRequest instanceof ClientRequest) {
            return $this->clientRequest->getServiceType()->getName();
        }

        return $this->requestSummary !== '' ? $this->requestSummary : 'Platform request';
    }

    public function resolveServiceCategory(): ?string
    {
        if ($this->serviceCategorySnapshot !== null && $this->serviceCategorySnapshot !== '') {
            return $this->serviceCategorySnapshot;
        }

        return $this->clientRequest?->getServiceType()->getCategory();
    }

    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
