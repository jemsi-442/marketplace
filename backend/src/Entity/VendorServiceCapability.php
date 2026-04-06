<?php

namespace App\Entity;

use App\Repository\VendorServiceCapabilityRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: VendorServiceCapabilityRepository::class)]
#[ORM\Table(name: 'vendor_service_capability')]
#[ORM\UniqueConstraint(name: 'uniq_vendor_service_capability', columns: ['vendor_id', 'service_type_id'])]
#[ORM\Index(name: 'idx_vendor_service_capability_vendor', columns: ['vendor_id'])]
#[ORM\Index(name: 'idx_vendor_service_capability_service_type', columns: ['service_type_id'])]
#[ORM\Index(name: 'idx_vendor_service_capability_active', columns: ['is_active'])]
#[ORM\HasLifecycleCallbacks]
class VendorServiceCapability
{
    public const CAPACITY_AVAILABLE = 'available';
    public const CAPACITY_LIMITED = 'limited';
    public const CAPACITY_UNAVAILABLE = 'unavailable';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: VendorProfile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private VendorProfile $vendor;

    #[ORM\ManyToOne(targetEntity: ServiceType::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private ServiceType $serviceType;

    #[ORM\Column(type: 'boolean', options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: 'string', length: 40)]
    private string $experienceLevel = 'standard';

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $startingPriceMinor = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $portfolioSummary = null;

    #[ORM\Column(type: 'string', length: 40)]
    private string $capacityStatus = self::CAPACITY_AVAILABLE;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $turnaroundNote = null;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $approvedByAdmin = false;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $adminReviewNote = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $reviewedAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $reviewedByAdmin = null;

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

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getVendor(): VendorProfile
    {
        return $this->vendor;
    }

    public function setVendor(VendorProfile $vendor): self
    {
        $this->vendor = $vendor;
        $this->touch();

        return $this;
    }

    public function getServiceType(): ServiceType
    {
        return $this->serviceType;
    }

    public function setServiceType(ServiceType $serviceType): self
    {
        $this->serviceType = $serviceType;
        $this->touch();

        return $this;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;
        $this->touch();

        return $this;
    }

    public function getExperienceLevel(): string
    {
        return $this->experienceLevel;
    }

    public function setExperienceLevel(string $experienceLevel): self
    {
        $this->experienceLevel = trim($experienceLevel);
        $this->touch();

        return $this;
    }

    public function getStartingPriceMinor(): ?int
    {
        return $this->startingPriceMinor;
    }

    public function setStartingPriceMinor(?int $startingPriceMinor): self
    {
        if ($startingPriceMinor !== null && $startingPriceMinor < 0) {
            throw new \LogicException('Starting price cannot be negative.');
        }

        $this->startingPriceMinor = $startingPriceMinor;
        $this->touch();

        return $this;
    }

    public function getPortfolioSummary(): ?string
    {
        return $this->portfolioSummary;
    }

    public function setPortfolioSummary(?string $portfolioSummary): self
    {
        $this->portfolioSummary = $portfolioSummary !== null ? trim($portfolioSummary) : null;
        $this->touch();

        return $this;
    }

    public function getCapacityStatus(): string
    {
        return $this->capacityStatus;
    }

    public function setCapacityStatus(string $capacityStatus): self
    {
        $this->capacityStatus = trim($capacityStatus);
        $this->touch();

        return $this;
    }

    public function getTurnaroundNote(): ?string
    {
        return $this->turnaroundNote;
    }

    public function setTurnaroundNote(?string $turnaroundNote): self
    {
        $this->turnaroundNote = $turnaroundNote !== null ? trim($turnaroundNote) : null;
        $this->touch();

        return $this;
    }

    public function isApprovedByAdmin(): bool
    {
        return $this->approvedByAdmin;
    }

    public function setApprovedByAdmin(bool $approvedByAdmin): self
    {
        $this->approvedByAdmin = $approvedByAdmin;
        $this->touch();

        return $this;
    }

    public function getAdminReviewNote(): ?string
    {
        return $this->adminReviewNote;
    }

    public function setAdminReviewNote(?string $adminReviewNote): self
    {
        $this->adminReviewNote = $adminReviewNote !== null ? trim($adminReviewNote) : null;
        $this->touch();

        return $this;
    }

    public function getReviewedAt(): ?\DateTimeImmutable
    {
        return $this->reviewedAt;
    }

    public function setReviewedAt(?\DateTimeImmutable $reviewedAt): self
    {
        $this->reviewedAt = $reviewedAt;
        $this->touch();

        return $this;
    }

    public function getReviewedByAdmin(): ?User
    {
        return $this->reviewedByAdmin;
    }

    public function setReviewedByAdmin(?User $reviewedByAdmin): self
    {
        $this->reviewedByAdmin = $reviewedByAdmin;
        $this->touch();

        return $this;
    }

    public function clearAdminReviewState(): self
    {
        $this->approvedByAdmin = false;
        $this->adminReviewNote = null;
        $this->reviewedAt = null;
        $this->reviewedByAdmin = null;
        $this->touch();

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    #[ORM\PreUpdate]
    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
