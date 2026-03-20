<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Escrow;
use App\Entity\EscrowRiskProfile;
use App\Entity\User;
use App\Entity\VendorTrustProfile;
use Doctrine\ORM\EntityManagerInterface;

class EscrowRiskEvaluator
{
    /**
     * @param array<string, float> $weights
     * @param array<string, float> $currencyRiskMap
     */
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly float $highAmountThresholdMinor,
        private readonly float $firstClientLargeAmountThresholdMinor,
        private readonly float $vendorDisputeRateThreshold,
        private readonly float $manualReviewThreshold,
        private readonly array $weights,
        private readonly array $currencyRiskMap
    ) {
    }

    /**
     * @param array<string, mixed> $context
     */
    public function evaluateAtCreation(Escrow $escrow, array $context = []): ?EscrowRiskProfile
    {
        try {
            $clientRiskScore = $this->userRiskScore($escrow->getClient());
            $vendorRiskScore = $this->vendorRiskScore($escrow->getVendor());
            $amountRiskFactor = $this->amountRiskFactor($escrow->getAmountMinor());
            $geoRiskFactor = $this->geoRiskFactor($escrow->getCurrency(), $context);

            $isFirstClientLarge = $this->isFirstClientLargePayment($escrow);
            $hasVendorDisputeAnomaly = $this->hasVendorDisputeAnomaly($escrow->getVendor());
            $anomalyFlag = $isFirstClientLarge || $hasVendorDisputeAnomaly || $amountRiskFactor >= 85;

            $finalRiskScore = $this->weightedRiskScore(
                $clientRiskScore,
                $vendorRiskScore,
                $amountRiskFactor,
                $geoRiskFactor,
                $anomalyFlag
            );

            $manualReviewRequired = $finalRiskScore >= $this->manualReviewThreshold;

            $profile = $this->em->getRepository(EscrowRiskProfile::class)->findOneBy(['escrow' => $escrow]);
            if (!$profile instanceof EscrowRiskProfile) {
                $profile = new EscrowRiskProfile($escrow);
                $this->em->persist($profile);
            }

            $snapshot = [
                'first_client_large' => $isFirstClientLarge,
                'vendor_dispute_anomaly' => $hasVendorDisputeAnomaly,
                'manual_review_required' => $manualReviewRequired,
            ];

            $profile->applyScores(
                clientRiskScore: $clientRiskScore,
                vendorRiskScore: $vendorRiskScore,
                amountRiskFactor: $amountRiskFactor,
                geoRiskFactor: $geoRiskFactor,
                anomalyFlag: $anomalyFlag,
                finalRiskScore: $finalRiskScore,
                manualReviewRequired: $manualReviewRequired,
                factorsSnapshot: $snapshot
            );

            $escrow->setRiskMetadata([
                'final_risk_score' => $finalRiskScore,
                'manual_review_required' => $manualReviewRequired,
                'anomaly_flag' => $anomalyFlag,
                'snapshot' => $snapshot,
            ]);

            return $profile;
        } catch (\Throwable) {
            // Risk engine must never block escrow creation path.
            return null;
        }
    }

    private function userRiskScore(User $user): float
    {
        $trustRisk = 100 - $user->getTrustScore();

        if ($user->getRiskLevel() === 'CRITICAL') {
            $trustRisk += 25;
        }

        return max(0.0, min(100.0, $trustRisk));
    }

    private function vendorRiskScore(User $vendor): float
    {
        $profile = $this->em->getRepository(VendorTrustProfile::class)->findOneBy(['vendor' => $vendor]);
        if (!$profile instanceof VendorTrustProfile) {
            return max(0.0, min(100.0, 100 - $vendor->getTrustScore()));
        }

        return max(0.0, min(100.0, 100 - $profile->getCalculatedTrustScore()));
    }

    private function amountRiskFactor(int $amountMinor): float
    {
        return max(0.0, min(100.0, ($amountMinor / max(1.0, $this->highAmountThresholdMinor)) * 100));
    }

    /**
     * @param array<string, mixed> $context
     */
    private function geoRiskFactor(string $currency, array $context): float
    {
        if (isset($context['geo_risk_factor']) && is_numeric($context['geo_risk_factor'])) {
            return max(0.0, min(100.0, (float) $context['geo_risk_factor']));
        }

        $currency = strtoupper($currency);

        return (float) ($this->currencyRiskMap[$currency] ?? 35.0);
    }

    private function isFirstClientLargePayment(Escrow $escrow): bool
    {
        $clientEscrowCount = (int) $this->em->getRepository(Escrow::class)
            ->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->where('e.client = :client')
            ->setParameter('client', $escrow->getClient())
            ->getQuery()
            ->getSingleScalarResult();

        return $clientEscrowCount <= 1 && $escrow->getAmountMinor() >= $this->firstClientLargeAmountThresholdMinor;
    }

    private function hasVendorDisputeAnomaly(User $vendor): bool
    {
        $profile = $this->em->getRepository(VendorTrustProfile::class)->findOneBy(['vendor' => $vendor]);
        if (!$profile instanceof VendorTrustProfile) {
            return false;
        }

        $completed = max(1, $profile->getCompletedJobsCount());
        $disputeRate = $profile->getDisputeCount() / $completed;

        return $disputeRate >= $this->vendorDisputeRateThreshold;
    }

    private function weightedRiskScore(
        float $clientRiskScore,
        float $vendorRiskScore,
        float $amountRiskFactor,
        float $geoRiskFactor,
        bool $anomalyFlag
    ): float {
        $score = 0.0;
        $score += $clientRiskScore * ($this->weights['client'] ?? 0.0);
        $score += $vendorRiskScore * ($this->weights['vendor'] ?? 0.0);
        $score += $amountRiskFactor * ($this->weights['amount'] ?? 0.0);
        $score += $geoRiskFactor * ($this->weights['geo'] ?? 0.0);

        if ($anomalyFlag) {
            $score += (float) ($this->weights['anomaly_boost'] ?? 0.0);
        }

        return round(max(0.0, min(100.0, $score)), 2);
    }
}
