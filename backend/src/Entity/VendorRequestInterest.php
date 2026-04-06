<?php

namespace App\Entity;

use App\Repository\VendorRequestInterestRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: VendorRequestInterestRepository::class)]
#[ORM\Table(name: 'vendor_request_interest')]
#[ORM\UniqueConstraint(name: 'uniq_vendor_request_interest', columns: ['client_request_id', 'vendor_id'])]
#[ORM\Index(name: 'idx_vendor_request_interest_request', columns: ['client_request_id'])]
#[ORM\Index(name: 'idx_vendor_request_interest_vendor', columns: ['vendor_id'])]
#[ORM\Index(name: 'idx_vendor_request_interest_status', columns: ['status'])]
#[ORM\HasLifecycleCallbacks]
class VendorRequestInterest
{
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_SHORTLISTED = 'shortlisted';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_WITHDRAWN = 'withdrawn';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: ClientRequest::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ClientRequest $clientRequest;

    #[ORM\ManyToOne(targetEntity: VendorProfile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private VendorProfile $vendor;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $message = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $proposedPriceMinor = null;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $priceReason = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $timelineNote = null;

    #[ORM\Column(type: 'string', length: 30)]
    private string $status = self::STATUS_SUBMITTED;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $submittedAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $reviewedAt = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $now = new \DateTimeImmutable();
        $this->submittedAt = $now;
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getClientRequest(): ClientRequest
    {
        return $this->clientRequest;
    }

    public function setClientRequest(ClientRequest $clientRequest): self
    {
        $this->clientRequest = $clientRequest;
        $this->touch();

        return $this;
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

    public function getMessage(): ?string
    {
        return $this->message;
    }

    public function setMessage(?string $message): self
    {
        $this->message = $message !== null ? trim($message) : null;
        $this->touch();

        return $this;
    }

    public function getProposedPriceMinor(): ?int
    {
        return $this->proposedPriceMinor;
    }

    public function setProposedPriceMinor(?int $proposedPriceMinor): self
    {
        if ($proposedPriceMinor !== null && $proposedPriceMinor < 0) {
            throw new \LogicException('Proposed price cannot be negative.');
        }

        $this->proposedPriceMinor = $proposedPriceMinor;
        $this->touch();

        return $this;
    }

    public function getPriceReason(): ?string
    {
        return $this->priceReason;
    }

    public function setPriceReason(?string $priceReason): self
    {
        $this->priceReason = $priceReason !== null ? trim($priceReason) : null;
        $this->touch();

        return $this;
    }

    public function getTimelineNote(): ?string
    {
        return $this->timelineNote;
    }

    public function setTimelineNote(?string $timelineNote): self
    {
        $this->timelineNote = $timelineNote !== null ? trim($timelineNote) : null;
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

    public function getSubmittedAt(): \DateTimeImmutable
    {
        return $this->submittedAt;
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
