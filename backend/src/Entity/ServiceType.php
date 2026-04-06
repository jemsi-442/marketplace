<?php

namespace App\Entity;

use App\Repository\ServiceTypeRepository;
use App\Support\ServiceGroupCatalog;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ServiceTypeRepository::class)]
#[ORM\Table(name: 'service_type')]
#[ORM\Index(name: 'idx_service_type_slug', columns: ['slug'])]
#[ORM\Index(name: 'idx_service_type_category', columns: ['category'])]
#[ORM\Index(name: 'idx_service_type_active', columns: ['is_active'])]
#[ORM\HasLifecycleCallbacks]
class ServiceType
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 160, unique: true)]
    #[Assert\NotBlank]
    private string $name = '';

    #[ORM\Column(type: 'string', length: 180, unique: true)]
    #[Assert\NotBlank]
    private string $slug = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: 'string', length: 120, nullable: true)]
    private ?string $category = null;

    #[ORM\Column(type: 'boolean', options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: 'boolean', options: ['default' => true])]
    private bool $requiresAdminAssignment = true;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $defaultBriefTemplate = null;

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

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = trim($name);
        $this->touch();

        return $this;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function setSlug(string $slug): self
    {
        $this->slug = strtolower(trim($slug));
        $this->touch();

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description !== null ? trim($description) : null;
        $this->touch();

        return $this;
    }

    public function getCategory(): ?string
    {
        return $this->category;
    }

    public function getGroupSlug(): string
    {
        return ServiceGroupCatalog::resolveSlugForCategory($this->category);
    }

    public function getGroupTitle(): string
    {
        $group = ServiceGroupCatalog::findBySlug($this->getGroupSlug());

        return is_array($group) ? (string) ($group['title'] ?? 'Automation & Business Operations') : 'Automation & Business Operations';
    }

    public function setCategory(?string $category): self
    {
        $this->category = $category !== null ? trim($category) : null;
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

    public function requiresAdminAssignment(): bool
    {
        return $this->requiresAdminAssignment;
    }

    public function setRequiresAdminAssignment(bool $requiresAdminAssignment): self
    {
        $this->requiresAdminAssignment = $requiresAdminAssignment;
        $this->touch();

        return $this;
    }

    public function getDefaultBriefTemplate(): ?string
    {
        return $this->defaultBriefTemplate;
    }

    public function setDefaultBriefTemplate(?string $defaultBriefTemplate): self
    {
        $this->defaultBriefTemplate = $defaultBriefTemplate !== null ? trim($defaultBriefTemplate) : null;
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
