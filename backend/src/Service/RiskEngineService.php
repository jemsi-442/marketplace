<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\FraudSignal;
use App\Entity\FraudRisk;
use App\Entity\Notification;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

class RiskEngineService
{
    /**
     * @param array<string, int|float> $thresholds
     * @param array<string, int|float> $weights
     */
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly NotificationService $notificationService,
        private readonly UserRepository $userRepository,
        private readonly array $thresholds = [],
        private readonly array $weights = []
    ) {
    }

    /**
     * @param array<string, mixed> $context
     */
    public function analyzeUser(User $user, array $context = [], bool $flush = true): int
    {
        $previousRisk = $this->loadLatestRisk($user);
        $score = 0;
        $reasons = [];
        $metadata = [
            'trigger' => $context['trigger'] ?? 'manual',
            'components' => [],
        ];

        $createdAt = $user->getCreatedAt();
        $ageDays = (new \DateTimeImmutable())->diff(\DateTimeImmutable::createFromInterface($createdAt))->days;

        $newAccountDays = (int) ($this->thresholds['new_account_days'] ?? 7);
        $failedLoginsThreshold = (int) ($this->thresholds['repeated_failed_logins'] ?? 3);
        $lowTrustThreshold = (float) ($this->thresholds['low_trust_score'] ?? 60);
        $lookbackHours = max(1, (int) ($this->thresholds['recent_signal_lookback_hours'] ?? 24));

        if ($ageDays < $newAccountDays) {
            $component = (int) ($this->weights['new_account'] ?? 15);
            $score += $component;
            $reasons[] = 'New account';
            $metadata['components']['new_account'] = $component;
        }

        if ($user->getFailedLoginAttempts() >= $failedLoginsThreshold) {
            $component = (int) ($this->weights['repeated_failed_logins'] ?? 20);
            $score += $component;
            $reasons[] = 'Repeated failed logins';
            $metadata['components']['failed_logins'] = $component;
        }

        if ($user->getTrustScore() < $lowTrustThreshold) {
            $component = (int) ($this->weights['low_trust_score'] ?? 25);
            $score += $component;
            $reasons[] = 'Low trust score';
            $metadata['components']['low_trust_score'] = $component;
        }

        $recentSignalSummary = $this->loadRecentSignalSummary($user, $lookbackHours);
        if ($recentSignalSummary['count'] > 0) {
            $signalCountWeight = (float) ($this->weights['recent_signal_count'] ?? 4);
            $severityMultiplier = (float) ($this->weights['recent_signal_severity_multiplier'] ?? 0.35);
            $signalComponent = (int) round(
                ($recentSignalSummary['count'] * $signalCountWeight)
                + ($recentSignalSummary['severity_sum'] * $severityMultiplier)
            );

            $score += min(45, $signalComponent);
            $reasons[] = sprintf('%d recent fraud signal(s)', $recentSignalSummary['count']);
            $metadata['components']['recent_signals'] = [
                'count' => $recentSignalSummary['count'],
                'severity_sum' => $recentSignalSummary['severity_sum'],
                'score' => min(45, $signalComponent),
                'lookback_hours' => $lookbackHours,
            ];
        }

        $score = max(0, min(100, $score));
        $user->setFraudRiskScore($score);

        $this->logRisk(
            $user,
            $score,
            $reasons === [] ? 'No elevated risk signals' : implode(', ', $reasons),
            $metadata,
            $previousRisk,
            $flush
        );

        return $score;
    }

    /**
     * @return array{count:int, severity_sum:int}
     */
    private function loadRecentSignalSummary(User $user, int $lookbackHours): array
    {
        /** @var array{signal_count?: mixed, severity_sum?: mixed} $row */
        $row = $this->em->getRepository(FraudSignal::class)
            ->createQueryBuilder('f')
            ->select('COUNT(f.id) AS signal_count, COALESCE(SUM(f.severity), 0) AS severity_sum')
            ->where('f.user = :user')
            ->andWhere('f.createdAt >= :lookback')
            ->setParameter('user', $user)
            ->setParameter('lookback', (new \DateTimeImmutable())->modify(sprintf('-%d hours', $lookbackHours)))
            ->getQuery()
            ->getSingleResult();

        $count = $row['signal_count'] ?? 0;
        $severitySum = $row['severity_sum'] ?? 0;

        return [
            'count' => is_numeric($count) ? (int) $count : 0,
            'severity_sum' => is_numeric($severitySum) ? (int) $severitySum : 0,
        ];
    }

    /**
     * @param array<string, mixed> $metadata
     */
    private function logRisk(
        User $user,
        int $score,
        string $reason,
        array $metadata,
        ?FraudRisk $previousRisk,
        bool $flush
    ): void
    {
        $risk = new FraudRisk($user, $score, $reason, $metadata);
        $this->em->persist($risk);
        $this->notifyAdminsOnEscalation($user, $risk, $previousRisk, $metadata);

        if ($flush) {
            $this->em->flush();
        }
    }

    private function loadLatestRisk(User $user): ?FraudRisk
    {
        $result = $this->em->getRepository(FraudRisk::class)
            ->createQueryBuilder('fr')
            ->where('fr.user = :user')
            ->setParameter('user', $user)
            ->orderBy('fr.createdAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        return $result instanceof FraudRisk ? $result : null;
    }

    /**
     * @param array<string, mixed> $metadata
     */
    private function notifyAdminsOnEscalation(User $user, FraudRisk $risk, ?FraudRisk $previousRisk, array $metadata): void
    {
        $newLevel = $risk->getRiskLevel();
        $previousLevel = $previousRisk?->getRiskLevel();
        $severityMap = [
            FraudRisk::LEVEL_LOW => 1,
            FraudRisk::LEVEL_MEDIUM => 2,
            FraudRisk::LEVEL_HIGH => 3,
            FraudRisk::LEVEL_CRITICAL => 4,
        ];

        $newSeverity = $severityMap[$newLevel] ?? 1;
        $previousSeverity = $severityMap[$previousLevel ?? FraudRisk::LEVEL_LOW] ?? 1;

        if ($newSeverity < ($severityMap[FraudRisk::LEVEL_HIGH] ?? 3) || $newSeverity <= $previousSeverity) {
            return;
        }

        $admins = $this->userRepository->findAdmins();
        if ($admins === []) {
            return;
        }

        $trigger = isset($metadata['trigger']) && is_string($metadata['trigger']) ? $metadata['trigger'] : 'manual';
        $title = $newLevel === FraudRisk::LEVEL_CRITICAL ? 'Critical risk escalation' : 'High risk user flagged';
        $message = sprintf(
            'User %s escalated to %s risk with score %d via %s.',
            $user->getEmail(),
            $newLevel,
            $risk->getScore(),
            strtoupper($trigger)
        );

        $this->notificationService->notifyMany(
            $admins,
            $title,
            $message,
            Notification::CATEGORY_RISK,
            false
        );
    }
}
