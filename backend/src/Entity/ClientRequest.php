<?php

namespace App\Entity;

use App\Repository\ClientRequestRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ClientRequestRepository::class)]
#[ORM\Table(name: 'client_request')]
#[ORM\Index(name: 'idx_client_request_client', columns: ['client_id'])]
#[ORM\Index(name: 'idx_client_request_service_type', columns: ['service_type_id'])]
#[ORM\Index(name: 'idx_client_request_status', columns: ['status'])]
#[ORM\HasLifecycleCallbacks]
class ClientRequest
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_MATCHED = 'matched';
    public const STATUS_VENDOR_INTEREST_OPEN = 'vendor_interest_open';
    public const STATUS_VENDOR_SELECTED = 'vendor_selected';
    public const STATUS_AWAITING_PAYMENT = 'awaiting_payment';
    public const STATUS_FUNDED = 'funded';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_DELIVERY_SUBMITTED = 'delivery_submitted';
    public const STATUS_REVISION_REQUESTED = 'revision_requested';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_DISPUTED = 'disputed';
    public const STATUS_CANCELLED = 'cancelled';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private User $client;

    #[ORM\ManyToOne(targetEntity: ServiceType::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private ServiceType $serviceType;

    #[ORM\ManyToOne(targetEntity: VendorProfile::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?VendorProfile $selectedVendor = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $assignedByAdmin = null;

    #[ORM\Column(type: 'string', length: 220)]
    private string $requestSummary = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $scopeDetails = null;

    #[ORM\Column(type: 'string', length: 160, nullable: true)]
    private ?string $deadlineNote = null;

    #[ORM\Column(type: 'string', length: 160, nullable: true)]
    private ?string $budgetNote = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $attachmentsCount = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $agreedPriceMinor = null;

    #[ORM\Column(type: 'string', length: 10, nullable: true)]
    private ?string $currency = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $agreedTimelineNote = null;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $adminAssignmentNote = null;

    #[ORM\Column(type: 'string', length: 40)]
    private string $status = self::STATUS_DRAFT;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $submittedAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $matchedAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $assignedAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $cancelledAt = null;

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

    public function getClient(): User
    {
        return $this->client;
    }

    public function setClient(User $client): self
    {
        $this->client = $client;
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

    public function getSelectedVendor(): ?VendorProfile
    {
        return $this->selectedVendor;
    }

    public function setSelectedVendor(?VendorProfile $selectedVendor): self
    {
        $this->selectedVendor = $selectedVendor;
        $this->touch();

        return $this;
    }

    public function getAssignedByAdmin(): ?User
    {
        return $this->assignedByAdmin;
    }

    public function setAssignedByAdmin(?User $assignedByAdmin): self
    {
        $this->assignedByAdmin = $assignedByAdmin;
        $this->touch();

        return $this;
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

    public function getBudgetNote(): ?string
    {
        return $this->budgetNote;
    }

    public function setBudgetNote(?string $budgetNote): self
    {
        $this->budgetNote = $budgetNote !== null ? trim($budgetNote) : null;
        $this->touch();

        return $this;
    }

    public function getAttachmentsCount(): ?int
    {
        return $this->attachmentsCount;
    }

    public function setAttachmentsCount(?int $attachmentsCount): self
    {
        if ($attachmentsCount !== null && $attachmentsCount < 0) {
            throw new \LogicException('Attachments count cannot be negative.');
        }

        $this->attachmentsCount = $attachmentsCount;
        $this->touch();

        return $this;
    }

    public function getAgreedPriceMinor(): ?int
    {
        return $this->agreedPriceMinor;
    }

    public function setAgreedPriceMinor(?int $agreedPriceMinor): self
    {
        if ($agreedPriceMinor !== null && $agreedPriceMinor < 0) {
            throw new \LogicException('Agreed price cannot be negative.');
        }

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

    public function getAgreedTimelineNote(): ?string
    {
        return $this->agreedTimelineNote;
    }

    public function setAgreedTimelineNote(?string $agreedTimelineNote): self
    {
        $this->agreedTimelineNote = $agreedTimelineNote !== null ? trim($agreedTimelineNote) : null;
        $this->touch();

        return $this;
    }

    public function getAdminAssignmentNote(): ?string
    {
        return $this->adminAssignmentNote;
    }

    public function setAdminAssignmentNote(?string $adminAssignmentNote): self
    {
        $this->adminAssignmentNote = $adminAssignmentNote !== null ? trim($adminAssignmentNote) : null;
        $this->touch();

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

    public function getSubmittedAt(): ?\DateTimeImmutable
    {
        return $this->submittedAt;
    }

    public function setSubmittedAt(?\DateTimeImmutable $submittedAt): self
    {
        $this->submittedAt = $submittedAt;
        $this->touch();

        return $this;
    }

    public function getMatchedAt(): ?\DateTimeImmutable
    {
        return $this->matchedAt;
    }

    public function setMatchedAt(?\DateTimeImmutable $matchedAt): self
    {
        $this->matchedAt = $matchedAt;
        $this->touch();

        return $this;
    }

    public function getAssignedAt(): ?\DateTimeImmutable
    {
        return $this->assignedAt;
    }

    public function setAssignedAt(?\DateTimeImmutable $assignedAt): self
    {
        $this->assignedAt = $assignedAt;
        $this->touch();

        return $this;
    }

    public function getCancelledAt(): ?\DateTimeImmutable
    {
        return $this->cancelledAt;
    }

    public function setCancelledAt(?\DateTimeImmutable $cancelledAt): self
    {
        $this->cancelledAt = $cancelledAt;
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

    public function markSubmitted(): self
    {
        $this->status = self::STATUS_SUBMITTED;
        $this->submittedAt = new \DateTimeImmutable();
        $this->touch();

        return $this;
    }

    #[ORM\PreUpdate]
    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
