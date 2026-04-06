<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\DeliveryAttachmentRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DeliveryAttachmentRepository::class)]
#[ORM\Table(name: 'delivery_attachment')]
#[ORM\Index(name: 'idx_delivery_attachment_delivery', columns: ['delivery_submission_id'])]
class DeliveryAttachment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: DeliverySubmission::class, inversedBy: 'attachments')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?DeliverySubmission $deliverySubmission = null;

    #[ORM\Column(type: 'string', length: 180)]
    private string $fileName = '';

    #[ORM\Column(type: 'string', length: 500)]
    private string $fileUrl = '';

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $storagePath = null;

    #[ORM\Column(type: 'string', length: 120, nullable: true)]
    private ?string $mimeType = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $sizeBytes = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getDeliverySubmission(): ?DeliverySubmission
    {
        return $this->deliverySubmission;
    }

    public function setDeliverySubmission(?DeliverySubmission $deliverySubmission): self
    {
        $this->deliverySubmission = $deliverySubmission;

        return $this;
    }

    public function getFileName(): string
    {
        return $this->fileName;
    }

    public function setFileName(string $fileName): self
    {
        $this->fileName = trim($fileName);

        return $this;
    }

    public function getFileUrl(): string
    {
        return $this->fileUrl;
    }

    public function setFileUrl(string $fileUrl): self
    {
        $this->fileUrl = trim($fileUrl);

        return $this;
    }

    public function getMimeType(): ?string
    {
        return $this->mimeType;
    }

    public function setMimeType(?string $mimeType): self
    {
        $this->mimeType = $mimeType !== null ? trim($mimeType) : null;

        return $this;
    }

    public function getSizeBytes(): ?int
    {
        return $this->sizeBytes;
    }

    public function setSizeBytes(?int $sizeBytes): self
    {
        $this->sizeBytes = $sizeBytes;

        return $this;
    }

    public function getStoragePath(): ?string
    {
        return $this->storagePath;
    }

    public function setStoragePath(?string $storagePath): self
    {
        $this->storagePath = $storagePath !== null ? trim($storagePath) : null;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
