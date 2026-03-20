<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\FraudSignal;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class FraudMonitoringService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly RiskEngineService $riskEngineService
    ) {
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function recordFailedPayment(User $user, array $metadata = []): void
    {
        $this->recordSignal($user, 'FAILED_PAYMENT', 35, $metadata);
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function recordRapidWithdrawalAttempt(User $user, array $metadata = []): void
    {
        $this->recordSignal($user, 'RAPID_WITHDRAWAL_ATTEMPT', 55, $metadata);
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function recordMultipleDisputes(User $user, array $metadata = []): void
    {
        $this->recordSignal($user, 'MULTIPLE_DISPUTES', 45, $metadata);
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function recordSignal(User $user, string $signalType, int $severity, array $metadata = []): void
    {
        $signal = new FraudSignal($user, $signalType, $severity, $metadata);
        $this->em->persist($signal);
        $this->em->flush();

        $lookback = (new \DateTimeImmutable())->modify('-24 hours');

        $recentSignalCount = (int) $this->em->getRepository(FraudSignal::class)
            ->createQueryBuilder('f')
            ->select('COUNT(f.id)')
            ->where('f.user = :user')
            ->andWhere('f.createdAt >= :lookback')
            ->setParameter('user', $user)
            ->setParameter('lookback', $lookback)
            ->getQuery()
            ->getSingleScalarResult();

        $recentHighSeverityCount = (int) $this->em->getRepository(FraudSignal::class)
            ->createQueryBuilder('f')
            ->select('COUNT(f.id)')
            ->where('f.user = :user')
            ->andWhere('f.createdAt >= :lookback')
            ->andWhere('f.severity >= :sev')
            ->setParameter('user', $user)
            ->setParameter('lookback', $lookback)
            ->setParameter('sev', 50)
            ->getQuery()
            ->getSingleScalarResult();

        $penalty = min(30.0, ($severity * 0.18) + ($recentSignalCount * 0.7) + ($recentHighSeverityCount * 2.5));
        $user->setTrustScore(max(0.0, $user->getTrustScore() - $penalty));

        $this->em->flush();
        $this->riskEngineService->analyzeUser($user, [
            'trigger' => 'fraud_signal',
            'signal_type' => $signalType,
        ]);
    }
}
