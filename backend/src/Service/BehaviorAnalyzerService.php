<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Payment;
use App\Entity\User;
use App\Entity\UserBehaviorProfile;
use Doctrine\ORM\EntityManagerInterface;

class BehaviorAnalyzerService
{
    /**
     * @param array<string, int|float> $thresholds
     * @param array<string, int|float> $weights
     */
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly array $thresholds = [],
        private readonly array $weights = []
    ) {
    }

    public function analyze(User $user, Payment $payment): int
    {
        $profile = $this->em->getRepository(UserBehaviorProfile::class)->findOneBy(['user' => $user]);

        if (!$profile instanceof UserBehaviorProfile) {
            return 0;
        }

        $score = 0;
        $amountSpikeMultiplier = max(1, (int) ($this->thresholds['amount_spike_multiplier'] ?? 3));
        $unusualHourGap = max(1, (int) ($this->thresholds['unusual_hour_gap'] ?? 5));

        if ($profile->getAvgTransactionAmountMinor() > 0 && $payment->getAmountMinor() > ($profile->getAvgTransactionAmountMinor() * $amountSpikeMultiplier)) {
            $score += (int) ($this->weights['amount_spike'] ?? 25);
        }

        $usualHour = $profile->getUsualLoginHour();
        if ($usualHour !== null) {
            $currentHour = (int) $payment->getCreatedAt()->format('G');
            if (abs($currentHour - $usualHour) > $unusualHourGap) {
                $score += (int) ($this->weights['unusual_hour'] ?? 15);
            }
        }

        return $score;
    }

    public function syncProfile(User $user, Payment $payment): void
    {
        $profile = $this->em->getRepository(UserBehaviorProfile::class)->findOneBy(['user' => $user]);
        if (!$profile instanceof UserBehaviorProfile) {
            $profile = new UserBehaviorProfile();
            $profile->setUser($user);
            $this->em->persist($profile);
        }

        $previousAverage = $profile->getAvgTransactionAmountMinor();
        $newAverage = $previousAverage > 0
            ? (int) round((($previousAverage * 4) + $payment->getAmountMinor()) / 5)
            : $payment->getAmountMinor();

        $currentHour = (int) $payment->getCreatedAt()->format('G');
        $previousHour = $profile->getUsualLoginHour();
        $newHour = $previousHour !== null
            ? (int) round((($previousHour * 4) + $currentHour) / 5)
            : $currentHour;

        $dailyTransactions = $this->countRecentPayments($user, 24);

        $profile->setAvgTransactionAmountMinor($newAverage);
        $profile->setAvgDailyTransactions($dailyTransactions);
        $profile->setUsualLoginHour($newHour);
    }

    private function countRecentPayments(User $user, int $lookbackHours): int
    {
        return (int) $this->em->getRepository(Payment::class)
            ->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->join('p.booking', 'b')
            ->where('b.client = :user')
            ->andWhere('p.createdAt >= :lookback')
            ->setParameter('user', $user)
            ->setParameter('lookback', (new \DateTimeImmutable())->modify(sprintf('-%d hours', $lookbackHours)))
            ->getQuery()
            ->getSingleScalarResult();
    }
}
