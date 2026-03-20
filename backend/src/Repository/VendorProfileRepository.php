<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\VendorProfile;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<VendorProfile>
 */
final class VendorProfileRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct(
            registry: $registry,
            entityClass: VendorProfile::class
        );
    }
}
