<?php

namespace App\Entity;

use App\Repository\ServiceRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ServiceRepository::class)]
#[ORM\Table(name: 'service')]
class Service
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: VendorProfile::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?VendorProfile $vendor = null;

    #[ORM\Column(type: 'string', length: 255)]
    #[Assert\NotBlank]
    private string $title = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    /*
     * MONEY — Stored as DECIMAL (string internally)
     * Prevents float precision issues
     */
    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    #[Assert\NotBlank]
    private string $price = '0.00';

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $category = null;

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
     * ==========================
     * BASIC GETTERS & SETTERS
     * ==========================
     */

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getVendor(): ?VendorProfile
    {
        return $this->vendor;
    }

    public function setVendor(VendorProfile $vendor): self
    {
        $this->vendor = $vendor;
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

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;
        return $this;
    }

    /*
     * Return float for business logic
     * Stored internally as string
     */
    public function getPrice(): float
    {
        return (float) $this->price;
    }

    /*
     * Accept float input but normalize to string
     */
    public function setPrice(float $price): self
    {
        if ($price < 0) {
            throw new \LogicException('Service price cannot be negative.');
        }

        $this->price = number_format($price, 2, '.', '');
        return $this;
    }

    /*
     * Optional: Raw value if needed
     */
    public function getRawPrice(): string
    {
        return $this->price;
    }

    public function getCategory(): ?string
    {
        return $this->category;
    }

    public function setCategory(?string $category): self
    {
        $this->category = $category;
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

    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
