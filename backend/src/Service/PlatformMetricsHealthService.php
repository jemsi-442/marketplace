<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\PlatformMetricsSnapshot;
use Doctrine\ORM\EntityManagerInterface;

class PlatformMetricsHealthService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly int $staleThresholdHours
    ) {
    }

    public function getHealthStatus(): array
    {
        $latest = $this->em->getRepository(PlatformMetricsSnapshot::class)
            ->findOneBy([], ['snapshotDate' => 'DESC']);

        if (!$latest instanceof PlatformMetricsSnapshot) {
            return [
                'status' => 'NO_DATA',
                'is_healthy' => false,
                'is_stale' => true,
                'stale_threshold_hours' => $this->staleThresholdHours,
                'message' => 'No metrics snapshot exists yet.',
            ];
        }

        $ageHours = (int) floor((time() - $latest->getSnapshotDate()->getTimestamp()) / 3600);
        $isStale = $ageHours > $this->staleThresholdHours;

        return [
            'status' => $isStale ? 'STALE' : 'HEALTHY',
            'is_healthy' => !$isStale,
            'is_stale' => $isStale,
            'stale_threshold_hours' => $this->staleThresholdHours,
            'last_snapshot_date' => $latest->getSnapshotDate()->format('Y-m-d'),
            'snapshot_age_hours' => $ageHours,
            'message' => $isStale
                ? 'Latest snapshot is older than configured threshold.'
                : 'Snapshot pipeline is healthy.',
        ];
    }

    public function getTrend(int $days): array
    {
        $days = max(1, min(365, $days));
        $fromDate = (new \DateTimeImmutable('today'))->modify('-' . ($days - 1) . ' days');

        $rows = $this->em->getRepository(PlatformMetricsSnapshot::class)
            ->createQueryBuilder('m')
            ->where('m.snapshotDate >= :fromDate')
            ->setParameter('fromDate', $fromDate)
            ->orderBy('m.snapshotDate', 'ASC')
            ->getQuery()
            ->getArrayResult();

        $count = count($rows);
        $volumeSum = 0;
        $feesSum = 0;
        $riskSum = 0.0;

        foreach ($rows as $row) {
            $volumeSum += (int) ($row['totalVolumeMinor'] ?? 0);
            $feesSum += (int) ($row['totalFeesCollectedMinor'] ?? 0);
            $riskSum += (float) ($row['highRiskEscrowPercentage'] ?? 0.0);
        }

        return [
            'window_days' => $days,
            'points' => $count,
            'summary' => [
                'total_volume_minor' => $volumeSum,
                'total_fees_collected_minor' => $feesSum,
                'avg_high_risk_escrow_percentage' => $count > 0 ? round($riskSum / $count, 6) : 0.0,
            ],
            'trend' => $rows,
        ];
    }
}
