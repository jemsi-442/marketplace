<?php

namespace App\Service;

use App\Entity\User;
use App\Entity\Payment;
use App\Entity\UserBehaviorProfile;
use Doctrine\ORM\EntityManagerInterface;

class BehaviorAnalyzerService
{
    public function __construct(
        private EntityManagerInterface $em
    ) {}

    public function analyze(User $user, Payment $payment): int
    {
        $profile = $this->em
            ->getRepository(UserBehaviorProfile::class)
            ->findOneBy(['user' => $user]);

        if (!$profile) {
            return 0; // No baseline yet
        }

        $score = 0;

        // 1️⃣ Amount anomaly
        if ($payment->getAmount() > ($profile->getAvgTransactionAmount() * 3)) {
            $score += 25;
        }

        // 2️⃣ Time anomaly
        $currentHour = (int) date('H');
        if (abs($currentHour - $profile->getUsualLoginHour()) > 5) {
            $score += 15;
        }

        // 3️⃣ Country anomaly
        if ($payment->getCountry() !== $profile->getUsualLoginCountry()) {
            $score += 30;
        }

        return $score;
    }
}
