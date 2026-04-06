<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ClientRequest;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ClientRequest>
 */
final class ClientRequestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct(
            registry: $registry,
            entityClass: ClientRequest::class
        );
    }
}
