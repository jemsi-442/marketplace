<?php

declare(strict_types=1);

namespace App\Service\Matching;

use App\Entity\VendorTrustProfile;
use App\Entity\VendorServiceCapability;
use Doctrine\ORM\EntityManagerInterface;

class RuleBasedMatchingStrategy implements MatchingStrategyInterface
{
    /**
     * @param array<string, float|int> $weights
     */
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly array $weights
    ) {
    }

    /**
     * @param array<int, VendorServiceCapability> $capabilities
     * @param array<string, mixed> $criteria
     * @return array<int, array<string, mixed>>
     */
    public function rank(array $capabilities, array $criteria): array
    {
        $queryValue = $criteria['query'] ?? '';
        $budgetValue = $criteria['budget_minor'] ?? 0;
        $riskToleranceValue = $criteria['risk_tolerance'] ?? 'MEDIUM';

        $query = is_string($queryValue) ? strtolower(trim($queryValue)) : '';
        $budgetMinor = is_numeric($budgetValue) ? (int) $budgetValue : 0;
        $riskTolerance = is_string($riskToleranceValue) ? strtoupper($riskToleranceValue) : 'MEDIUM';

        $ranked = [];

        foreach ($capabilities as $capability) {
            $vendor = $capability->getVendor()->getUser();
            $serviceType = $capability->getServiceType();
            $startingPriceMinor = $capability->getStartingPriceMinor() ?? 0;

            $trustProfile = $this->em->getRepository(VendorTrustProfile::class)->findOneBy(['vendor' => $vendor]);
            $trustScore = $trustProfile instanceof VendorTrustProfile
                ? $trustProfile->getCalculatedTrustScore()
                : $vendor->getTrustScore();

            $relevanceScore = $this->relevanceScore($capability, $query);
            $priceFitScore = $this->priceFitScore($startingPriceMinor, $budgetMinor);
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
                'service_id' => null,
                'service_type_id' => $serviceType->getId(),
                'capability_id' => $capability->getId(),
                'title' => $serviceType->getName(),
                'price_cents' => $startingPriceMinor,
                'vendor_id' => $vendor->getId(),
                'category' => $serviceType->getCategory(),
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

    private function relevanceScore(VendorServiceCapability $capability, string $query): float
    {
        if ($query === '') {
            return 50.0;
        }

        $serviceType = $capability->getServiceType();
        $haystack = strtolower(trim(implode(' ', array_filter([
            $serviceType->getName(),
            $serviceType->getSlug(),
            $serviceType->getCategory(),
            $capability->getPortfolioSummary(),
            $capability->getTurnaroundNote(),
            $capability->getExperienceLevel(),
        ], static fn (?string $value): bool => is_string($value) && trim($value) !== ''))));
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
