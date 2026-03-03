<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Payment;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class TransactionMonitorService
{
    public function __construct(
        private readonly RiskEngineService $riskEngine,
        private readonly EntityManagerInterface $em
    ) {
    }

    public function monitorPayment(Payment $payment): void
    {
        $user = $payment->getBooking()?->getClient();
        if (!$user instanceof User) {
            return;
        }

        $riskScore = $this->riskEngine->analyzeUser($user);

        if ($this->isHighVelocity($user)) {
            $riskScore += 30;
        }

        if ($payment->getAmount() > 5000) {
            $riskScore += 20;
        }

        $this->applyDecision($payment, $riskScore);
    }

    private function isHighVelocity(User $user): bool
    {
        $recentPayments = $this->em->getRepository(Payment::class)
            ->createQueryBuilder('p')
            ->join('p.booking', 'b')
            ->where('b.client = :user')
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
            $payment->setStatus('failed');
        } elseif ($riskScore >= 60 && $payment->getStatus() === 'completed') {
            $payment->setStatus('pending');
        }

        $this->em->flush();
    }
}
