<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\WithdrawalRequest;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<WithdrawalRequest>
 */
class WithdrawalRequestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, WithdrawalRequest::class);
    }

    public function findOneByReference(string $reference): ?WithdrawalRequest
    {
        return $this->findOneBy(['reference' => $reference]);
    }

    public function findOneByPayoutReference(string $payoutReference): ?WithdrawalRequest
    {
        return $this->findOneBy(['payoutReference' => $payoutReference]);
    }
}
