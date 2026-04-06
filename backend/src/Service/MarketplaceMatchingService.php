<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\VendorServiceCapability;
use App\Service\Matching\MatchingStrategyInterface;
use Doctrine\ORM\EntityManagerInterface;

class MarketplaceMatchingService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly MatchingStrategyInterface $matchingStrategy
    ) {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function rankVendors(
        string $searchQuery,
        int $budgetMinor,
        ?int $timelineDays,
        string $riskTolerance,
        int $limit = 20
    ): array {
        $qb = $this->em->getRepository(VendorServiceCapability::class)
            ->createQueryBuilder('c')
            ->join('c.serviceType', 'st')
            ->join('c.vendor', 'vp')
            ->join('vp.user', 'vu')
            ->where('c.isActive = true')
            ->andWhere('c.approvedByAdmin = true')
            ->setMaxResults(max(1, min(100, $limit * 4)));

        if ($budgetMinor > 0) {
            $qb->andWhere('(c.startingPriceMinor IS NULL OR c.startingPriceMinor <= :budget * 1.8)')
                ->setParameter('budget', $budgetMinor);
        }

        /** @var array<int, VendorServiceCapability> $capabilities */
        $capabilities = $qb->getQuery()->getResult();

        $ranked = $this->matchingStrategy->rank($capabilities, [
            'query' => $searchQuery,
            'budget_minor' => $budgetMinor,
            'timeline_days' => $timelineDays,
            'risk_tolerance' => $riskTolerance,
        ]);

        return array_slice($ranked, 0, $limit);
    }
}
