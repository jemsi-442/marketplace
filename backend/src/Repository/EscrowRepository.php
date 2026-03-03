<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Escrow;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class EscrowRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Escrow::class);
    }

    public function findOneByReference(string $reference): ?Escrow
    {
        return $this->findOneBy(['reference' => $reference]);
    }
}
