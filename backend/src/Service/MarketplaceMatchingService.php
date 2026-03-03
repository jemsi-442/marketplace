<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Service;
use App\Service\Matching\MatchingStrategyInterface;
use Doctrine\ORM\EntityManagerInterface;

class MarketplaceMatchingService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly MatchingStrategyInterface $matchingStrategy
    ) {
    }

    public function rankVendors(
        string $searchQuery,
        int $budgetMinor,
        ?int $timelineDays,
        string $riskTolerance,
        int $limit = 20
    ): array {
        $qb = $this->em->getRepository(Service::class)
            ->createQueryBuilder('s')
            ->where('s.isActive = true')
            ->setMaxResults(max(1, min(100, $limit * 4)));

        if ($budgetMinor > 0) {
            $qb->andWhere('s.priceCents <= :budget * 1.8')
                ->setParameter('budget', $budgetMinor);
        }

        $services = $qb->getQuery()->getResult();

        $ranked = $this->matchingStrategy->rank($services, [
            'query' => $searchQuery,
            'budget_minor' => $budgetMinor,
            'timeline_days' => $timelineDays,
            'risk_tolerance' => $riskTolerance,
        ]);

        return array_slice($ranked, 0, $limit);
    }
}
