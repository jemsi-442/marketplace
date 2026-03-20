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

    /**
     * @return array{
     *     status: string,
     *     is_healthy: bool,
     *     is_stale: bool,
     *     stale_threshold_hours: int,
     *     message: string,
     *     last_snapshot_date?: string,
     *     snapshot_age_hours?: int
     * }
     */
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

    /**
     * @return array{
     *     window_days: int,
     *     points: int,
     *     summary: array{
     *         total_volume_minor: int,
     *         total_fees_collected_minor: int,
     *         avg_high_risk_escrow_percentage: float
     *     },
     *     trend: array<int, array<string, mixed>>
     * }
     */
    public function getTrend(int $days): array
    {
        $days = max(1, min(365, $days));
        $fromDate = (new \DateTimeImmutable('today'))->modify('-' . ($days - 1) . ' days');

        /** @var array<int, array<string, mixed>> $rows */
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
            $volume = $row['totalVolumeMinor'] ?? 0;
            $fees = $row['totalFeesCollectedMinor'] ?? 0;
            $risk = $row['highRiskEscrowPercentage'] ?? 0.0;

            $volumeSum += is_numeric($volume) ? (int) $volume : 0;
            $feesSum += is_numeric($fees) ? (int) $fees : 0;
            $riskSum += is_numeric($risk) ? (float) $risk : 0.0;
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
