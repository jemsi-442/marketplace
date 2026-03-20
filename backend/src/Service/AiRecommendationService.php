<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\AiInteraction;
use App\Entity\Service;
use App\Entity\User;
use App\Entity\VendorTrustProfile;
use App\Repository\AiInteractionRepository;
use App\Repository\ServiceRepository;
use Doctrine\ORM\EntityManagerInterface;

class AiRecommendationService
{
    public function __construct(
        private readonly ServiceRepository $serviceRepo,
        private readonly AiInteractionRepository $aiRepo,
        private readonly EntityManagerInterface $em,
        private readonly MarketplaceMatchingService $matchingService
    ) {
    }

    /**
     * @param array<string, mixed> $criteria
     * @return array<int, array<string, mixed>>
     */
    public function recommendServices(User $user, array $criteria = [], int $limit = 5): array
    {
        $limit = max(1, min(20, $limit));
        $queryValue = $criteria['query'] ?? '';
        $budgetValue = $criteria['budget_minor'] ?? 0;
        $timelineValue = $criteria['timeline_days'] ?? null;
        $riskToleranceValue = $criteria['risk_tolerance'] ?? 'MEDIUM';

        $searchQuery = is_string($queryValue) ? trim($queryValue) : '';
        $budgetMinor = is_numeric($budgetValue) ? max(0, (int) $budgetValue) : 0;
        $timelineDays = is_numeric($timelineValue) ? (int) $timelineValue : null;
        $riskTolerance = is_string($riskToleranceValue) ? strtoupper($riskToleranceValue) : 'MEDIUM';

        if ($searchQuery !== '' || $budgetMinor > 0 || $timelineDays !== null) {
            return $this->matchingService->rankVendors(
                searchQuery: $searchQuery,
                budgetMinor: $budgetMinor,
                timelineDays: $timelineDays,
                riskTolerance: $riskTolerance,
                limit: $limit
            );
        }

        $preferredCategories = $this->loadPreferredCategories($user);
        $services = $this->loadCandidateServices($preferredCategories, $limit);
        if ($services === []) {
            return [];
        }

        $serviceIds = array_map(static fn (Service $service): ?int => $service->getId(), $services);
        $serviceIds = array_values(array_filter($serviceIds, static fn (?int $id): bool => $id !== null));

        $reviewStats = $this->loadReviewStats($serviceIds);
        $trustScores = $this->loadVendorTrustScores($services);
        $maxPriceCents = max(1, ...array_map(static fn (Service $service): int => $service->getPriceCents(), $services));

        $ranked = [];
        foreach ($services as $service) {
            $serviceId = $service->getId();
            if ($serviceId === null) {
                continue;
            }

            $vendorUser = $service->getVendor()->getUser();

            $serviceReviewStats = $reviewStats[$serviceId] ?? ['avg_rating' => 0.0, 'review_count' => 0];
            $trustScore = $trustScores[$vendorUser->getId()] ?? $vendorUser->getTrustScore();
            $categoryAffinity = $this->categoryAffinityScore($service, $preferredCategories);
            $reviewScore = ((float) $serviceReviewStats['avg_rating'] / 5.0) * 100.0;
            $priceScore = max(20.0, 100.0 - (($service->getPriceCents() / $maxPriceCents) * 100.0));

            $composite = ($trustScore * 0.45)
                + ($reviewScore * 0.25)
                + ($categoryAffinity * 0.20)
                + ($priceScore * 0.10);

            $ranked[] = [
                'service_id' => $serviceId,
                'title' => $service->getTitle(),
                'vendor_id' => $vendorUser->getId(),
                'category' => $service->getCategory(),
                'price_cents' => $service->getPriceCents(),
                'signals' => [
                    'trust_score' => round($trustScore, 2),
                    'average_rating' => round((float) $serviceReviewStats['avg_rating'], 2),
                    'review_count' => (int) $serviceReviewStats['review_count'],
                    'category_affinity' => round($categoryAffinity, 2),
                    'price_score' => round($priceScore, 2),
                ],
                'composite_score' => round($composite, 2),
                'source' => 'personalized_recommendation',
            ];
        }

        usort($ranked, static fn (array $a, array $b): int => $b['composite_score'] <=> $a['composite_score']);

        return array_slice($ranked, 0, $limit);
    }

    public function handleQuestion(string $question): string
    {
        $questionKey = strtolower(trim($question));

        $existing = $this->aiRepo->findOneBy(['question' => $questionKey]);
        if ($existing instanceof AiInteraction) {
            return $existing->getAnswer();
        }

        $allowedKeywords = [
            'service', 'vendor', 'booking', 'payment', 'marketplace', 'review',
            'notification', 'escrow', 'wallet', 'withdrawal', 'trust', 'fraud',
        ];

        $isRelevant = false;
        foreach ($allowedKeywords as $keyword) {
            if (str_contains($questionKey, $keyword)) {
                $isRelevant = true;
                break;
            }
        }

        if (!$isRelevant) {
            $answer = 'Samahani, uliza kuhusu marketplace yetu: services, vendors, bookings, escrow, wallets, withdrawals, reviews, au trust/risk.';
        } else {
            $answer = sprintf("Swali lako limepokelewa: '%s'. Kwa sasa AI layer ni rule-based, hivyo jibu la kina linapaswa kutegemea data ya marketplace yetu.", $question);
        }

        $interaction = new AiInteraction();
        $interaction->setQuestion($questionKey);
        $interaction->setAnswer($answer);
        $this->em->persist($interaction);
        $this->em->flush();

        return $answer;
    }

    /**
     * @return array<int, string>
     */
    private function loadPreferredCategories(User $user): array
    {
        /** @var array<int, array{category?: mixed, usage_count?: mixed}> $rows */
        $rows = $this->em->getRepository(\App\Entity\Booking::class)
            ->createQueryBuilder('b')
            ->select('s.category AS category, COUNT(b.id) AS usage_count')
            ->join('b.service', 's')
            ->where('b.client = :user')
            ->andWhere('s.category IS NOT NULL')
            ->groupBy('s.category')
            ->orderBy('usage_count', 'DESC')
            ->setParameter('user', $user)
            ->setMaxResults(3)
            ->getQuery()
            ->getArrayResult();

        $categories = [];
        foreach ($rows as $row) {
            $category = $row['category'] ?? null;
            if (is_string($category) && $category !== '') {
                $categories[] = $category;
            }
        }

        return $categories;
    }

    /**
     * @param array<int, string> $preferredCategories
     * @return array<int, Service>
     */
    private function loadCandidateServices(array $preferredCategories, int $limit): array
    {
        $qb = $this->serviceRepo->createQueryBuilder('s')
            ->where('s.isActive = true')
            ->setMaxResults($limit * 4);

        if ($preferredCategories !== []) {
            $qb->andWhere('s.category IN (:categories)')
                ->setParameter('categories', $preferredCategories);
        }

        /** @var Service[] $services */
        $services = $qb->getQuery()->getResult();

        if (count($services) >= $limit || $preferredCategories === []) {
            return $services;
        }

        /** @var array<int, Service> $fallbackServices */
        $fallbackServices = $this->serviceRepo->createQueryBuilder('s')
            ->where('s.isActive = true')
            ->setMaxResults($limit * 4)
            ->getQuery()
            ->getResult();

        $merged = [];
        foreach (array_merge($services, $fallbackServices) as $service) {
            if ($service->getId() === null) {
                continue;
            }

            $merged[$service->getId()] = $service;
        }

        return array_values($merged);
    }

    /**
     * @param array<int, int> $serviceIds
     * @return array<int, array{avg_rating: float, review_count: int}>
     */
    private function loadReviewStats(array $serviceIds): array
    {
        if ($serviceIds === []) {
            return [];
        }

        /** @var array<int, array{service_id?: mixed, avg_rating?: mixed, review_count?: mixed}> $rows */
        $rows = $this->em->getRepository(\App\Entity\Review::class)
            ->createQueryBuilder('r')
            ->select('IDENTITY(b.service) AS service_id, AVG(r.rating) AS avg_rating, COUNT(r.id) AS review_count')
            ->join('r.booking', 'b')
            ->where('IDENTITY(b.service) IN (:serviceIds)')
            ->groupBy('b.service')
            ->setParameter('serviceIds', $serviceIds)
            ->getQuery()
            ->getArrayResult();

        $stats = [];
        foreach ($rows as $row) {
            $serviceId = $row['service_id'] ?? null;
            if (!is_numeric($serviceId)) {
                continue;
            }

            $avgRating = $row['avg_rating'] ?? 0.0;
            $reviewCount = $row['review_count'] ?? 0;
            $stats[(int) $serviceId] = [
                'avg_rating' => is_numeric($avgRating) ? (float) $avgRating : 0.0,
                'review_count' => is_numeric($reviewCount) ? (int) $reviewCount : 0,
            ];
        }

        return $stats;
    }

    /**
     * @param array<int, Service> $services
     * @return array<int, float>
     */
    private function loadVendorTrustScores(array $services): array
    {
        $vendorIds = [];
        foreach ($services as $service) {
            $vendorUserId = $service->getVendor()->getUser()->getId();
            if ($vendorUserId !== null) {
                $vendorIds[$vendorUserId] = $vendorUserId;
            }
        }

        if ($vendorIds === []) {
            return [];
        }

        /** @var array<int, array{vendor_id?: mixed, trust_score?: mixed}> $rows */
        $rows = $this->em->getRepository(VendorTrustProfile::class)
            ->createQueryBuilder('vtp')
            ->select('IDENTITY(vtp.vendor) AS vendor_id, vtp.calculatedTrustScore AS trust_score')
            ->where('IDENTITY(vtp.vendor) IN (:vendorIds)')
            ->setParameter('vendorIds', array_values($vendorIds))
            ->getQuery()
            ->getArrayResult();

        $scores = [];
        foreach ($rows as $row) {
            $vendorId = $row['vendor_id'] ?? null;
            if (!is_numeric($vendorId)) {
                continue;
            }

            $trustScore = $row['trust_score'] ?? 0.0;
            $scores[(int) $vendorId] = is_numeric($trustScore) ? (float) $trustScore : 0.0;
        }

        return $scores;
    }

    /**
     * @param array<int, string> $preferredCategories
     */
    private function categoryAffinityScore(Service $service, array $preferredCategories): float
    {
        if ($preferredCategories === []) {
            return 50.0;
        }

        $category = $service->getCategory();
        if ($category === null || $category === '') {
            return 30.0;
        }

        $position = array_search($category, $preferredCategories, true);
        if ($position === false) {
            return 20.0;
        }

        return match ($position) {
            0 => 100.0,
            1 => 80.0,
            default => 60.0,
        };
    }
}
