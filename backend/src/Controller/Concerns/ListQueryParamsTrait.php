<?php

declare(strict_types=1);

namespace App\Controller\Concerns;

use Symfony\Component\HttpFoundation\Request;

trait ListQueryParamsTrait
{
    private function readListLimit(Request $request, int $default = 100, int $max = 200): int
    {
        return max(1, min((int) $request->query->get('limit', $default), $max));
    }

    private function readPage(Request $request, int $default = 1): int
    {
        return max(1, (int) $request->query->get('page', $default));
    }

    /**
     * @return array{0:int,1:int}
     */
    private function clampPageWithinTotal(int $page, int $totalItems, int $limit): array
    {
        $totalPages = max(1, (int) ceil($totalItems / max(1, $limit)));

        return [min($page, $totalPages), $totalPages];
    }

    private function readSearch(Request $request, string $key = 'search'): string
    {
        $value = $request->query->get($key, '');

        return is_string($value) ? trim($value) : '';
    }

    /**
     * @param array<int, string> $allowed
     */
    private function readEnumFilter(
        Request $request,
        array $allowed,
        string $default = 'all',
        string $primaryKey = 'view',
        ?string $legacyKey = null
    ): string {
        $fallback = $legacyKey !== null ? $request->query->get($legacyKey, $default) : $default;
        $value = $request->query->get($primaryKey, $fallback);
        $normalized = is_string($value) ? trim($value) : $default;

        return in_array($normalized, $allowed, true) ? $normalized : $default;
    }
}
