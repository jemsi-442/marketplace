<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\VendorServiceCapability;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<VendorServiceCapability>
 */
final class VendorServiceCapabilityRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct(
            registry: $registry,
            entityClass: VendorServiceCapability::class
        );
    }
}
