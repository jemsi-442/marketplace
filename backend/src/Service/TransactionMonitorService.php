<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Payment;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class TransactionMonitorService
{
    /**
     * @param array<string, int> $thresholds
     */
    public function __construct(
        private readonly RiskEngineService $riskEngine,
        private readonly BehaviorAnalyzerService $behaviorAnalyzer,
        private readonly EntityManagerInterface $em,
        private readonly array $thresholds = []
    ) {
    }

    public function monitorPayment(Payment $payment, bool $flush = true): void
    {
        $user = $payment->getBooking()->getClient();

        $riskScore = $this->riskEngine->analyzeUser($user, [
            'trigger' => 'payment_monitor',
            'payment_id' => $payment->getId(),
        ], false);

        $riskScore += $this->behaviorAnalyzer->analyze($user, $payment);

        if ($this->isHighVelocity($user)) {
            $riskScore += (int) ($this->thresholds['high_velocity_score_boost'] ?? 30);
        }

        if ($payment->getAmountMinor() > (int) ($this->thresholds['large_payment_amount_minor'] ?? 500000)) {
            $riskScore += (int) ($this->thresholds['large_payment_score_boost'] ?? 20);
        }

        $this->applyDecision($payment, $riskScore);

        if ($payment->getStatus() !== 'failed') {
            $this->behaviorAnalyzer->syncProfile($user, $payment);
        }

        if ($flush) {
            $this->em->flush();
        }
    }

    private function isHighVelocity(User $user): bool
    {
        $windowMinutes = max(1, (int) ($this->thresholds['velocity_window_minutes'] ?? 10));
        $velocityCount = max(1, (int) ($this->thresholds['velocity_count'] ?? 5));

        /** @var array<int, Payment> $recentPayments */
        $recentPayments = $this->em->getRepository(Payment::class)
            ->createQueryBuilder('p')
            ->join('p.booking', 'b')
            ->where('b.client = :user')
            ->andWhere('p.createdAt > :time')
            ->setParameter('user', $user)
            ->setParameter('time', (new \DateTimeImmutable())->modify(sprintf('-%d minutes', $windowMinutes)))
            ->getQuery()
            ->getResult();

        return count($recentPayments) >= $velocityCount;
    }

    private function applyDecision(Payment $payment, int $riskScore): void
    {
        $failThreshold = (int) ($this->thresholds['fail_threshold'] ?? 80);
        $pendingThreshold = (int) ($this->thresholds['pending_threshold'] ?? 60);

        if ($riskScore >= $failThreshold) {
            $payment->setStatus('failed');
        } elseif ($riskScore >= $pendingThreshold && $payment->getStatus() === 'completed') {
            $payment->setStatus('pending');
        }
    }
}
