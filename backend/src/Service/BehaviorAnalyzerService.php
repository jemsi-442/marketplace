<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Payment;
use App\Entity\User;
use App\Entity\UserBehaviorProfile;
use Doctrine\ORM\EntityManagerInterface;

class BehaviorAnalyzerService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function analyze(User $user, Payment $payment): int
    {
        $profile = $this->em->getRepository(UserBehaviorProfile::class)->findOneBy(['user' => $user]);

        if (!$profile instanceof UserBehaviorProfile) {
            return 0;
        }

        $score = 0;

        if ($payment->getAmount() > ($profile->getAvgTransactionAmount() * 3)) {
            $score += 25;
        }

        $usualHour = $profile->getUsualLoginHour();
        if ($usualHour !== null) {
            $currentHour = (int) date('H');
            if (abs($currentHour - $usualHour) > 5) {
                $score += 15;
            }
        }

        return $score;
    }
}
