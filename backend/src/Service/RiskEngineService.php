<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\FraudRisk;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class RiskEngineService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function analyzeUser(User $user): int
    {
        $score = 0;
        $reasons = [];

        $createdAt = $user->getCreatedAt();
        $ageDays = (new \DateTimeImmutable())->diff(\DateTimeImmutable::createFromInterface($createdAt))->days;

        if ($ageDays < 7) {
            $score += 15;
            $reasons[] = 'New account';
        }

        if ($user->getFailedLoginAttempts() >= 3) {
            $score += 20;
            $reasons[] = 'Repeated failed logins';
        }

        if ($user->getTrustScore() < 60) {
            $score += 25;
            $reasons[] = 'Low trust score';
        }

        if ($score > 0) {
            $this->logRisk($user, $score, implode(', ', $reasons));
        }

        return $score;
    }

    private function logRisk(User $user, int $score, string $reason): void
    {
        $risk = new FraudRisk($user, $score, $reason);
        $this->em->persist($risk);
        $this->em->flush();
    }
}
