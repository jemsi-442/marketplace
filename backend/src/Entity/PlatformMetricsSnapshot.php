<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'platform_metrics_snapshot')]
#[ORM\UniqueConstraint(name: 'uniq_platform_metrics_snapshot_date', columns: ['snapshot_date'])]
class PlatformMetricsSnapshot
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'bigint')]
    private int $totalVolumeMinor = 0;

    #[ORM\Column(type: 'bigint')]
    private int $totalFeesCollectedMinor = 0;

    #[ORM\Column(type: 'float')]
    private float $disputeRate = 0.0;

    #[ORM\Column(type: 'float')]
    private float $refundRate = 0.0;

    #[ORM\Column(type: 'float')]
    private float $avgTrustScore = 0.0;

    #[ORM\Column(type: 'float')]
    private float $highRiskEscrowPercentage = 0.0;

    #[ORM\Column(type: 'date_immutable', name: 'snapshot_date')]
    private \DateTimeImmutable $snapshotDate;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(\DateTimeImmutable $snapshotDate)
    {
        $this->snapshotDate = $snapshotDate->setTime(0, 0);
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getSnapshotDate(): \DateTimeImmutable
    {
        return $this->snapshotDate;
    }

    public function update(
        int $totalVolumeMinor,
        int $totalFeesCollectedMinor,
        float $disputeRate,
        float $refundRate,
        float $avgTrustScore,
        float $highRiskEscrowPercentage
    ): void {
        $this->totalVolumeMinor = max(0, $totalVolumeMinor);
        $this->totalFeesCollectedMinor = max(0, $totalFeesCollectedMinor);
        $this->disputeRate = round(max(0.0, min(1.0, $disputeRate)), 6);
        $this->refundRate = round(max(0.0, min(1.0, $refundRate)), 6);
        $this->avgTrustScore = round(max(0.0, min(100.0, $avgTrustScore)), 2);
        $this->highRiskEscrowPercentage = round(max(0.0, min(1.0, $highRiskEscrowPercentage)), 6);
    }
}
