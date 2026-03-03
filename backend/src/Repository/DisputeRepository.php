<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Dispute;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

final class DisputeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct(
            registry: $registry,
            entityClass: Dispute::class
        );
    }
}
