<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\AiInteraction;
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
}
