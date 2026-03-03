<?php

declare(strict_types=1);

namespace App\Service\Matching;

use App\Entity\Service;

interface MatchingStrategyInterface
{
    /**
     * @param Service[] $services
     * @return array<int, array<string, mixed>>
     */
    public function rank(array $services, array $criteria): array;
}
