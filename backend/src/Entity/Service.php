<?php

namespace App\Entity;

use App\Repository\ServiceRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ServiceRepository::class)]
#[ORM\Table(name: 'service')]
#[ORM\Index(name: 'idx_service_vendor', columns: ['vendor_id'])]
#[ORM\Index(name: 'idx_service_category', columns: ['category'])]
#[ORM\HasLifecycleCallbacks]
class Service
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    /*
     * RELATIONSHIP — Restrict delete for financial safety
     */
    #[ORM\ManyToOne(targetEntity: VendorProfile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private VendorProfile $vendor;

    #[ORM\Column(type: 'string', length: 255)]
    #[Assert\NotBlank]
    private string $title = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    /*
     * MONEY — Stored as INTEGER (cents)
     * Prevents float precision issues
     */
    #[ORM\Column(type: 'integer')]
    private int $priceCents = 0;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $category = null;

    /*
     * STATE CONTROL
     */
    #[ORM\Column(type: 'boolean')]
    private bool $isActive = true;

    /*
     * VERSIONING — For price integrity tracking
     */
    #[ORM\Column(type: 'integer')]
    private int $version = 1;

    /*
     * AUDIT FIELDS
     */
    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;

    public function __construct()
    {
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    /*
     * ==========================
     * BASIC GETTERS
     * ==========================
     */

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getVendor(): VendorProfile
    {
        return $this->vendor;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function getCategory(): ?string
    {
        return $this->category;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function getVersion(): int
    {
        return $this->version;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getDeletedAt(): ?\DateTimeImmutable
    {
        return $this->deletedAt;
    }

    /*
     * ==========================
     * MONEY HANDLING (SAFE)
     * ==========================
     */

    public function getPriceCents(): int
    {
        return $this->priceCents;
    }

    public function setPriceCents(int $priceCents): self
    {
        if ($priceCents < 0) {
            throw new \LogicException('Service price cannot be negative.');
        }

        if ($this->priceCents !== $priceCents) {
            $this->version++;
        }

        $this->priceCents = $priceCents;

        return $this;
    }

    public function getPrice(): float
    {
        return $this->priceCents / 100;
    }

    public function setPrice(float $price): self
    {
        return $this->setPriceCents((int) round($price * 100));
    }

    /*
     * ==========================
     * MUTATORS
     * ==========================
     */

    public function setVendor(VendorProfile $vendor): self
    {
        $this->vendor = $vendor;
        return $this;
    }

    public function setTitle(string $title): self
    {
        $this->title = $title;
        return $this;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;
        return $this;
    }

    public function setCategory(?string $category): self
    {
        $this->category = $category;
        return $this;
    }

    public function deactivate(): void
    {
        $this->isActive = false;
    }

    public function softDelete(): void
    {
        $this->deletedAt = new \DateTimeImmutable();
        $this->isActive = false;
    }

    /*
     * ==========================
     * LIFECYCLE CALLBACKS
     * ==========================
     */

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
