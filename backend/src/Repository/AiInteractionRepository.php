<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\AiInteraction;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AiInteraction>
 */
final class AiInteractionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct(
            registry: $registry,
            entityClass: AiInteraction::class
        );
    }

    /**
     * @return array<int, AiInteraction>
     */
    public function findRecentForUser(User $user, int $limit = 6, ?string $contextTag = null, ?array $contextFilter = null): array
    {
        /** @var array<int, AiInteraction> $results */
        $results = $this->createQueryBuilder('ai')
            ->andWhere('ai.user = :user')
            ->setParameter('user', $user)
            ->orderBy('ai.createdAt', 'DESC')
            ->setMaxResults(max(1, min($limit * 4, 80)));

        if ($contextTag !== null && $contextTag !== '') {
            $results
                ->andWhere('ai.contextTag = :contextTag')
                ->setParameter('contextTag', $contextTag);
        }

        $items = $results->getQuery()->getResult();
        $filtered = $this->filterByContextData($items, $contextFilter);

        return array_slice($filtered, 0, max(1, min($limit, 20)));
    }

    /**
     * @return array<int, AiInteraction>
     */
    public function findAllForUser(User $user, ?string $contextTag = null, ?array $contextFilter = null): array
    {
        /** @var array<int, AiInteraction> $results */
        $results = $this->createQueryBuilder('ai')
            ->andWhere('ai.user = :user')
            ->setParameter('user', $user)
            ->orderBy('ai.createdAt', 'DESC');

        if ($contextTag !== null && $contextTag !== '') {
            $results
                ->andWhere('ai.contextTag = :contextTag')
                ->setParameter('contextTag', $contextTag);
        }

        return $this->filterByContextData($results->getQuery()->getResult(), $contextFilter);
    }

    /**
     * @return array<int, AiInteraction>
     */
    public function findSavedNotesForUser(User $user, ?string $contextTag = null, ?array $contextFilter = null): array
    {
        /** @var array<int, AiInteraction> $results */
        $results = $this->createQueryBuilder('ai')
            ->andWhere('ai.user = :user')
            ->andWhere('ai.isSavedNote = :saved')
            ->setParameter('user', $user)
            ->setParameter('saved', true)
            ->orderBy('ai.savedAt', 'DESC')
            ->addOrderBy('ai.createdAt', 'DESC');

        if ($contextTag !== null && $contextTag !== '') {
            $results
                ->andWhere('ai.contextTag = :contextTag')
                ->setParameter('contextTag', $contextTag);
        }

        return $this->filterByContextData($results->getQuery()->getResult(), $contextFilter);
    }

    /**
     * @param array<int, AiInteraction> $items
     * @param array{key?: string, value?: mixed}|null $contextFilter
     * @return array<int, AiInteraction>
     */
    private function filterByContextData(array $items, ?array $contextFilter): array
    {
        $key = isset($contextFilter['key']) && is_string($contextFilter['key']) ? trim($contextFilter['key']) : '';
        if ($key === '') {
            return $items;
        }

        $expectedValue = $contextFilter['value'] ?? null;

        return array_values(array_filter(
            $items,
            static function (AiInteraction $interaction) use ($key, $expectedValue): bool {
                $contextData = $interaction->getContextData();
                if (!is_array($contextData) || !array_key_exists($key, $contextData)) {
                    return false;
                }

                $value = $contextData[$key];

                if (is_numeric($expectedValue) && is_numeric($value)) {
                    return (string) $value === (string) $expectedValue;
                }

                if (is_bool($expectedValue)) {
                    return (bool) $value === $expectedValue;
                }

                return (string) $value === (string) $expectedValue;
            }
        ));
    }
}
