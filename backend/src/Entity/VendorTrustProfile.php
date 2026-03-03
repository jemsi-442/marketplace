<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'vendor_trust_profile')]
#[ORM\UniqueConstraint(name: 'uniq_vendor_trust_vendor', columns: ['vendor_id'])]
class VendorTrustProfile
{
    public const RISK_LOW = 'LOW';
    public const RISK_MEDIUM = 'MEDIUM';
    public const RISK_HIGH = 'HIGH';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'vendor_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private User $vendor;

    #[ORM\Column(type: 'integer')]
    private int $completedJobsCount = 0;

    #[ORM\Column(type: 'integer')]
    private int $disputeCount = 0;

    #[ORM\Column(type: 'float')]
    private float $averageRating = 0.0;

    #[ORM\Column(type: 'float')]
    private float $escrowReleaseRatio = 0.0;

    #[ORM\Column(type: 'float')]
    private float $onTimeDeliveryRatio = 0.0;

    #[ORM\Column(type: 'float')]
    private float $refundRatio = 0.0;

    #[ORM\Column(type: 'bigint')]
    private int $totalVolumeMinor = 0;

    #[ORM\Column(type: 'float')]
    private float $calculatedTrustScore = 0.0;

    #[ORM\Column(type: 'string', length: 20)]
    private string $riskLevel = self::RISK_HIGH;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $lastCalculationMetadata = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct(User $vendor)
    {
        $this->vendor = $vendor;
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getVendor(): User
    {
        return $this->vendor;
    }

    public function getDisputeCount(): int
    {
        return $this->disputeCount;
    }

    public function getCompletedJobsCount(): int
    {
        return $this->completedJobsCount;
    }

    public function getEscrowReleaseRatio(): float
    {
        return $this->escrowReleaseRatio;
    }

    public function getCalculatedTrustScore(): float
    {
        return $this->calculatedTrustScore;
    }

    public function getRiskLevel(): string
    {
        return $this->riskLevel;
    }

    public function applySnapshot(
        int $completedJobsCount,
        int $disputeCount,
        float $averageRating,
        float $escrowReleaseRatio,
        float $onTimeDeliveryRatio,
        float $refundRatio,
        int $totalVolumeMinor,
        float $calculatedTrustScore,
        string $riskLevel,
        array $metadata = []
    ): void {
        $this->completedJobsCount = max(0, $completedJobsCount);
        $this->disputeCount = max(0, $disputeCount);
        $this->averageRating = max(0.0, min(5.0, $averageRating));
        $this->escrowReleaseRatio = max(0.0, min(1.0, $escrowReleaseRatio));
        $this->onTimeDeliveryRatio = max(0.0, min(1.0, $onTimeDeliveryRatio));
        $this->refundRatio = max(0.0, min(1.0, $refundRatio));
        $this->totalVolumeMinor = max(0, $totalVolumeMinor);
        $this->calculatedTrustScore = round(max(0.0, min(100.0, $calculatedTrustScore)), 2);
        $this->riskLevel = $riskLevel;
        $this->lastCalculationMetadata = $metadata;
        $this->updatedAt = new \DateTimeImmutable();
    }
}
