<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\DeliverySubmissionRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DeliverySubmissionRepository::class)]
#[ORM\Table(name: 'delivery_submission')]
#[ORM\Index(name: 'idx_delivery_submission_booking', columns: ['booking_id'])]
#[ORM\Index(name: 'idx_delivery_submission_vendor', columns: ['vendor_id'])]
#[ORM\Index(name: 'idx_delivery_submission_status', columns: ['status'])]
#[ORM\HasLifecycleCallbacks]
class DeliverySubmission
{
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_CHANGES_REQUESTED = 'changes_requested';
    public const STATUS_APPROVED = 'approved';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Booking::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Booking $booking;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private User $vendor;

    #[ORM\Column(type: 'text')]
    private string $deliveryNote = '';

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $deliveryLink = null;

    #[ORM\Column(type: 'string', length: 30)]
    private string $status = self::STATUS_SUBMITTED;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $reviewNote = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $submittedAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $reviewedAt = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    /**
     * @var Collection<int, DeliveryAttachment>
     */
    #[ORM\OneToMany(mappedBy: 'deliverySubmission', targetEntity: DeliveryAttachment::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['id' => 'ASC'])]
    private Collection $attachments;

    public function __construct()
    {
        $now = new \DateTimeImmutable();
        $this->submittedAt = $now;
        $this->createdAt = $now;
        $this->updatedAt = $now;
        $this->attachments = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getBooking(): Booking
    {
        return $this->booking;
    }

    public function setBooking(Booking $booking): self
    {
        $this->booking = $booking;
        $this->touch();

        return $this;
    }

    public function getVendor(): User
    {
        return $this->vendor;
    }

    public function setVendor(User $vendor): self
    {
        $this->vendor = $vendor;
        $this->touch();

        return $this;
    }

    public function getDeliveryNote(): string
    {
        return $this->deliveryNote;
    }

    public function setDeliveryNote(string $deliveryNote): self
    {
        $this->deliveryNote = trim($deliveryNote);
        $this->touch();

        return $this;
    }

    public function getDeliveryLink(): ?string
    {
        return $this->deliveryLink;
    }

    public function setDeliveryLink(?string $deliveryLink): self
    {
        $this->deliveryLink = $deliveryLink !== null ? trim($deliveryLink) : null;
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

    public function getReviewNote(): ?string
    {
        return $this->reviewNote;
    }

    public function setReviewNote(?string $reviewNote): self
    {
        $this->reviewNote = $reviewNote !== null ? trim($reviewNote) : null;
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

    /**
     * @return Collection<int, DeliveryAttachment>
     */
    public function getAttachments(): Collection
    {
        return $this->attachments;
    }

    public function addAttachment(DeliveryAttachment $attachment): self
    {
        if (!$this->attachments->contains($attachment)) {
            $this->attachments->add($attachment);
            $attachment->setDeliverySubmission($this);
            $this->touch();
        }

        return $this;
    }

    public function removeAttachment(DeliveryAttachment $attachment): self
    {
        if ($this->attachments->removeElement($attachment)) {
            if ($attachment->getDeliverySubmission() === $this) {
                $attachment->setDeliverySubmission(null);
            }
            $this->touch();
        }

        return $this;
    }

    #[ORM\PreUpdate]
    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
