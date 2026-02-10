<?php

namespace App\Service;

use App\Entity\User;
use App\Entity\Booking;
use App\Entity\FraudRisk;
use Doctrine\ORM\EntityManagerInterface;

class RiskEngineService
{
    public function __construct(private EntityManagerInterface $em) {}

    public function analyzeUser(User $user): int
    {
        $score = 0;
        $reasons = [];

        // Account age
        $age = (new \DateTime())->diff($user->getCreatedAt())->days;
        if ($age < 7) {
            $score += 15;
            $reasons[] = "New account";
        }

        // Too many disputes
        if (count($user->getDisputes()) > 3) {
            $score += 20;
            $reasons[] = "High dispute rate";
        }

        // Too many 5-star reviews in short time
        if ($this->rapidFiveStarPattern($user)) {
            $score += 20;
            $reasons[] = "Review manipulation pattern";
        }

        if ($score > 0) {
            $this->logRisk($user, $score, implode(', ', $reasons));
        }

        return $score;
    }

    private function rapidFiveStarPattern(User $user): bool
    {
        $reviews = $user->getReviews();
        $recent = 0;

        foreach ($reviews as $review) {
            if ($review->getRating() == 5 &&
                $review->getCreatedAt() > (new \DateTime('-24 hours'))) {
                $recent++;
            }
        }

        return $recent >= 5;
    }

    private function logRisk(User $user, int $score, string $reason): void
    {
        $risk = new FraudRisk($user, $score, $reason);
        $this->em->persist($risk);
        $this->em->flush();
    }
}
