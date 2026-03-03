<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Booking;
use App\Entity\Dispute;
use App\Entity\Escrow;
use App\Entity\Review;
use App\Entity\User;
use App\Entity\VendorTrustProfile;
use Doctrine\ORM\EntityManagerInterface;

class VendorTrustCalculator
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly array $weights,
        private readonly int $volumeCapMinor,
        private readonly float $mediumRiskThreshold,
        private readonly float $highRiskThreshold
    ) {
    }

    public function recalculateForVendor(User $vendor, string $trigger, array $context = []): VendorTrustProfile
    {
        $completedJobs = $this->countCompletedJobs($vendor);
        $disputeCount = $this->countDisputes($vendor);
        $averageRating = $this->averageRating($vendor);

        $releasedCount = $this->countEscrowByStatus($vendor, [Escrow::STATUS_RELEASED]);
        $resolvedCount = $this->countEscrowByStatus($vendor, [Escrow::STATUS_RESOLVED]);
        $finalizedCount = $releasedCount + $resolvedCount;

        $escrowReleaseRatio = $finalizedCount > 0 ? $releasedCount / $finalizedCount : 1.0;
        $refundRatio = $finalizedCount > 0 ? $resolvedCount / $finalizedCount : 0.0;

        $inProgressEscrows = $this->countEscrowByStatus($vendor, [Escrow::STATUS_ACTIVE, Escrow::STATUS_DISPUTED]);
        $onTimeDeliveryRatio = ($completedJobs + $inProgressEscrows) > 0
            ? $completedJobs / ($completedJobs + $inProgressEscrows)
            : 1.0;

        $totalVolumeMinor = $this->sumReleasedVolumeMinor($vendor);

        $score = $this->computeScore(
            averageRating: $averageRating,
            escrowReleaseRatio: $escrowReleaseRatio,
            onTimeDeliveryRatio: $onTimeDeliveryRatio,
            refundRatio: $refundRatio,
            disputeCount: $disputeCount,
            completedJobs: $completedJobs,
            totalVolumeMinor: $totalVolumeMinor
        );

        $riskLevel = $this->resolveRiskLevel($score);

        $profile = $this->em->getRepository(VendorTrustProfile::class)->findOneBy(['vendor' => $vendor]);
        if (!$profile instanceof VendorTrustProfile) {
            $profile = new VendorTrustProfile($vendor);
            $this->em->persist($profile);
        }

        $profile->applySnapshot(
            completedJobsCount: $completedJobs,
            disputeCount: $disputeCount,
            averageRating: $averageRating,
            escrowReleaseRatio: $escrowReleaseRatio,
            onTimeDeliveryRatio: $onTimeDeliveryRatio,
            refundRatio: $refundRatio,
            totalVolumeMinor: $totalVolumeMinor,
            calculatedTrustScore: $score,
            riskLevel: $riskLevel,
            metadata: [
                'trigger' => $trigger,
                'context' => $context,
                'computed_at' => (new \DateTimeImmutable())->format(DATE_ATOM),
            ]
        );

        // Keep User trust/risk in sync with profile score for existing risk engine hooks.
        $vendor->setTrustScore($score);

        $this->em->flush();

        return $profile;
    }

    private function computeScore(
        float $averageRating,
        float $escrowReleaseRatio,
        float $onTimeDeliveryRatio,
        float $refundRatio,
        int $disputeCount,
        int $completedJobs,
        int $totalVolumeMinor
    ): float {
        $ratingScore = $averageRating > 0 ? ($averageRating / 5.0) : 0.5;
        $volumeScore = min(1.0, $totalVolumeMinor / max(1, $this->volumeCapMinor));
        $disputeRate = $completedJobs > 0 ? min(1.0, $disputeCount / $completedJobs) : 0.0;

        $score01 = 0.0;
        $score01 += $ratingScore * ($this->weights['rating'] ?? 0.0);
        $score01 += $escrowReleaseRatio * ($this->weights['escrow_release_ratio'] ?? 0.0);
        $score01 += $onTimeDeliveryRatio * ($this->weights['on_time_delivery_ratio'] ?? 0.0);
        $score01 += (1.0 - $refundRatio) * ($this->weights['refund_ratio_inverse'] ?? 0.0);
        $score01 += (1.0 - $disputeRate) * ($this->weights['dispute_rate_inverse'] ?? 0.0);
        $score01 += $volumeScore * ($this->weights['volume'] ?? 0.0);

        return round(max(0.0, min(1.0, $score01)) * 100, 2);
    }

    private function resolveRiskLevel(float $trustScore): string
    {
        if ($trustScore >= $this->mediumRiskThreshold) {
            return VendorTrustProfile::RISK_LOW;
        }

        if ($trustScore >= $this->highRiskThreshold) {
            return VendorTrustProfile::RISK_MEDIUM;
        }

        return VendorTrustProfile::RISK_HIGH;
    }

    private function countCompletedJobs(User $vendor): int
    {
        return (int) $this->em->getRepository(Booking::class)
            ->createQueryBuilder('b')
            ->select('COUNT(b.id)')
            ->join('b.service', 's')
            ->join('s.vendor', 'vp')
            ->join('vp.user', 'vu')
            ->where('vu = :vendor')
            ->andWhere('b.status = :status')
            ->setParameter('vendor', $vendor)
            ->setParameter('status', Booking::STATUS_COMPLETED)
            ->getQuery()
            ->getSingleScalarResult();
    }

    private function countDisputes(User $vendor): int
    {
        return (int) $this->em->getRepository(Dispute::class)
            ->createQueryBuilder('d')
            ->select('COUNT(d.id)')
            ->join('d.booking', 'b')
            ->join('b.service', 's')
            ->join('s.vendor', 'vp')
            ->join('vp.user', 'vu')
            ->where('vu = :vendor')
            ->setParameter('vendor', $vendor)
            ->getQuery()
            ->getSingleScalarResult();
    }

    private function averageRating(User $vendor): float
    {
        $result = $this->em->getRepository(Review::class)
            ->createQueryBuilder('r')
            ->select('AVG(r.rating)')
            ->join('r.booking', 'b')
            ->join('b.service', 's')
            ->join('s.vendor', 'vp')
            ->join('vp.user', 'vu')
            ->where('vu = :vendor')
            ->setParameter('vendor', $vendor)
            ->getQuery()
            ->getSingleScalarResult();

        return $result !== null ? (float) $result : 0.0;
    }

    private function countEscrowByStatus(User $vendor, array $statuses): int
    {
        return (int) $this->em->getRepository(Escrow::class)
            ->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->where('e.vendor = :vendor')
            ->andWhere('e.status IN (:statuses)')
            ->setParameter('vendor', $vendor)
            ->setParameter('statuses', $statuses)
            ->getQuery()
            ->getSingleScalarResult();
    }

    private function sumReleasedVolumeMinor(User $vendor): int
    {
        $result = $this->em->getRepository(Escrow::class)
            ->createQueryBuilder('e')
            ->select('SUM(e.amountMinor)')
            ->where('e.vendor = :vendor')
            ->andWhere('e.status = :status')
            ->setParameter('vendor', $vendor)
            ->setParameter('status', Escrow::STATUS_RELEASED)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) ($result ?? 0);
    }
}
