<?php

declare(strict_types=1);

namespace App\Service\Matching;

use App\Entity\VendorServiceCapability;

interface MatchingStrategyInterface
{
    /**
     * @param VendorServiceCapability[] $capabilities
     * @param array<string, mixed> $criteria
     * @return array<int, array<string, mixed>>
     */
    public function rank(array $capabilities, array $criteria): array;
}
