<?php

namespace App\Service;

use App\Entity\Payment;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class TransactionMonitorService
{
    public function __construct(
        private RiskEngineService $riskEngine,
        private EntityManagerInterface $em
    ) {}

    public function monitorPayment(Payment $payment): void
    {
        $user = $payment->getUser();

        $riskScore = $this->riskEngine->analyzeUser($user);

        // Velocity check
        if ($this->isHighVelocity($user)) {
            $riskScore += 30;
        }

        // Large amount check
        if ($payment->getAmount() > 5000) {
            $riskScore += 20;
        }

        // Decision engine
        $this->applyDecision($payment, $riskScore);
    }

    private function isHighVelocity(User $user): bool
    {
        $recentPayments = $this->em->getRepository(Payment::class)
            ->createQueryBuilder('p')
            ->where('p.user = :user')
            ->andWhere('p.createdAt > :time')
            ->setParameter('user', $user)
            ->setParameter('time', new \DateTime('-10 minutes'))
            ->getQuery()
            ->getResult();

        return count($recentPayments) >= 5;
    }

    private function applyDecision(Payment $payment, int $riskScore): void
    {
        if ($riskScore >= 80) {
            $payment->setStatus('FROZEN');
        } elseif ($riskScore >= 60) {
            $payment->setStatus('FLAGGED');
        }

        $this->em->flush();
    }
}
