<?php

declare(strict_types=1);

namespace App\Service\Matching;

use App\Entity\Service;
use App\Entity\VendorTrustProfile;
use Doctrine\ORM\EntityManagerInterface;

class RuleBasedMatchingStrategy implements MatchingStrategyInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly array $weights
    ) {
    }

    public function rank(array $services, array $criteria): array
    {
        $query = strtolower(trim((string) ($criteria['query'] ?? '')));
        $budgetMinor = (int) ($criteria['budget_minor'] ?? 0);
        $riskTolerance = strtoupper((string) ($criteria['risk_tolerance'] ?? 'MEDIUM'));

        $ranked = [];

        foreach ($services as $service) {
            if (!$service instanceof Service) {
                continue;
            }

            $vendor = $service->getVendor()?->getUser();
            if ($vendor === null) {
                continue;
            }

            $trustProfile = $this->em->getRepository(VendorTrustProfile::class)->findOneBy(['vendor' => $vendor]);
            $trustScore = $trustProfile instanceof VendorTrustProfile
                ? $trustProfile->getCalculatedTrustScore()
                : $vendor->getTrustScore();

            $relevanceScore = $this->relevanceScore($service, $query);
            $priceFitScore = $this->priceFitScore($service->getPriceCents(), $budgetMinor);
            $historicalSimilarity = $trustProfile instanceof VendorTrustProfile
                ? $trustProfile->getEscrowReleaseRatio() * 100
                : 50.0;

            $trustWeightBoost = match ($riskTolerance) {
                'LOW' => 1.2,
                'HIGH' => 0.8,
                default => 1.0,
            };

            $composite = 0.0;
            $composite += $trustScore * (($this->weights['trust_score'] ?? 0.4) * $trustWeightBoost);
            $composite += $relevanceScore * ($this->weights['relevance'] ?? 0.25);
            $composite += $priceFitScore * ($this->weights['price_fit'] ?? 0.2);
            $composite += $historicalSimilarity * ($this->weights['historical_similarity'] ?? 0.15);

            $ranked[] = [
                'service_id' => $service->getId(),
                'title' => $service->getTitle(),
                'price_cents' => $service->getPriceCents(),
                'vendor_id' => $vendor->getId(),
                'scores' => [
                    'composite' => round($composite, 2),
                    'trust' => round($trustScore, 2),
                    'relevance' => round($relevanceScore, 2),
                    'price_fit' => round($priceFitScore, 2),
                    'historical_similarity' => round($historicalSimilarity, 2),
                ],
            ];
        }

        usort($ranked, static fn (array $a, array $b): int => $b['scores']['composite'] <=> $a['scores']['composite']);

        return $ranked;
    }

    private function relevanceScore(Service $service, string $query): float
    {
        if ($query === '') {
            return 50.0;
        }

        $haystack = strtolower(trim($service->getTitle() . ' ' . ($service->getDescription() ?? '') . ' ' . ($service->getCategory() ?? '')));
        $tokens = array_values(array_filter(explode(' ', $query), static fn (string $token): bool => strlen($token) >= 2));
        if ($tokens === []) {
            return 50.0;
        }

        $matches = 0;
        foreach ($tokens as $token) {
            if (str_contains($haystack, $token)) {
                $matches++;
            }
        }

        return ($matches / count($tokens)) * 100;
    }

    private function priceFitScore(int $priceCents, int $budgetMinor): float
    {
        if ($budgetMinor <= 0) {
            return 50.0;
        }

        if ($priceCents <= $budgetMinor) {
            return 100.0;
        }

        $overBudgetRatio = ($priceCents - $budgetMinor) / max(1, $budgetMinor);

        return max(0.0, 100.0 - ($overBudgetRatio * 100.0));
    }
}
