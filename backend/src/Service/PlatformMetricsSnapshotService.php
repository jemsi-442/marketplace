<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Booking;
use App\Entity\Dispute;
use App\Entity\Escrow;
use App\Entity\EscrowRiskProfile;
use App\Entity\PlatformMetricsSnapshot;
use App\Entity\VendorTrustProfile;
use App\Entity\WalletAccount;
use App\Entity\WalletLedgerEntry;
use Doctrine\ORM\EntityManagerInterface;

class PlatformMetricsSnapshotService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly float $highRiskEscrowThreshold
    ) {
    }

    public function createSnapshot(?\DateTimeImmutable $date = null): PlatformMetricsSnapshot
    {
        $snapshotDate = ($date ?? new \DateTimeImmutable('today'))->setTime(0, 0);

        $snapshot = $this->em->getRepository(PlatformMetricsSnapshot::class)
            ->findOneBy(['snapshotDate' => $snapshotDate]);

        if (!$snapshot instanceof PlatformMetricsSnapshot) {
            $snapshot = new PlatformMetricsSnapshot($snapshotDate);
            $this->em->persist($snapshot);
        }

        $totalVolumeMinor = $this->sumEscrowVolume();
        $totalFeesCollectedMinor = $this->sumPlatformFees();

        $completedJobs = $this->countBookingsByStatus(Booking::STATUS_COMPLETED);
        $disputeCount = (int) $this->em->getRepository(Dispute::class)
            ->createQueryBuilder('d')
            ->select('COUNT(d.id)')
            ->getQuery()
            ->getSingleScalarResult();
        $disputeRate = $completedJobs > 0 ? $disputeCount / $completedJobs : 0.0;

        $finalizedEscrows = (int) $this->em->getRepository(Escrow::class)
            ->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->where('e.status IN (:statuses)')
            ->setParameter('statuses', [Escrow::STATUS_RELEASED, Escrow::STATUS_RESOLVED])
            ->getQuery()
            ->getSingleScalarResult();
        $refundEscrows = (int) $this->em->getRepository(Escrow::class)
            ->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->where('e.status = :status')
            ->setParameter('status', Escrow::STATUS_RESOLVED)
            ->getQuery()
            ->getSingleScalarResult();
        $refundRate = $finalizedEscrows > 0 ? $refundEscrows / $finalizedEscrows : 0.0;

        $avgTrustScore = (float) ($this->em->getRepository(VendorTrustProfile::class)
            ->createQueryBuilder('v')
            ->select('AVG(v.calculatedTrustScore)')
            ->getQuery()
            ->getSingleScalarResult() ?? 0.0);

        $totalRiskProfiles = (int) $this->em->getRepository(EscrowRiskProfile::class)
            ->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->getQuery()
            ->getSingleScalarResult();
        $highRiskProfiles = (int) $this->em->getRepository(EscrowRiskProfile::class)
            ->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->where('r.finalRiskScore >= :threshold')
            ->setParameter('threshold', $this->highRiskEscrowThreshold)
            ->getQuery()
            ->getSingleScalarResult();

        $highRiskEscrowPercentage = $totalRiskProfiles > 0 ? $highRiskProfiles / $totalRiskProfiles : 0.0;

        $snapshot->update(
            totalVolumeMinor: $totalVolumeMinor,
            totalFeesCollectedMinor: $totalFeesCollectedMinor,
            disputeRate: $disputeRate,
            refundRate: $refundRate,
            avgTrustScore: $avgTrustScore,
            highRiskEscrowPercentage: $highRiskEscrowPercentage
        );

        $this->em->flush();

        return $snapshot;
    }

    private function countBookingsByStatus(string $status): int
    {
        return (int) $this->em->getRepository(Booking::class)
            ->createQueryBuilder('b')
            ->select('COUNT(b.id)')
            ->where('b.status = :status')
            ->setParameter('status', $status)
            ->getQuery()
            ->getSingleScalarResult();
    }

    private function sumEscrowVolume(): int
    {
        $result = $this->em->getRepository(Escrow::class)
            ->createQueryBuilder('e')
            ->select('SUM(e.amountMinor)')
            ->where('e.status IN (:statuses)')
            ->setParameter('statuses', [
                Escrow::STATUS_FUNDED,
                Escrow::STATUS_ACTIVE,
                Escrow::STATUS_RELEASED,
                Escrow::STATUS_DISPUTED,
                Escrow::STATUS_RESOLVED,
            ])
            ->getQuery()
            ->getSingleScalarResult();

        return (int) ($result ?? 0);
    }

    private function sumPlatformFees(): int
    {
        $result = $this->em->getRepository(WalletLedgerEntry::class)
            ->createQueryBuilder('l')
            ->select('SUM(l.amountMinor)')
            ->join('l.account', 'a')
            ->where('a.type = :accountType')
            ->andWhere('l.entryType = :entryType')
            ->setParameter('accountType', WalletAccount::TYPE_PLATFORM_REVENUE)
            ->setParameter('entryType', WalletLedgerEntry::ENTRY_CREDIT)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) ($result ?? 0);
    }
}
