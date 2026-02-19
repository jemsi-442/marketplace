<?php

namespace App\Repository;

use App\Entity\WalletLedgerEntry;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class WalletLedgerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, WalletLedgerEntry::class);
    }

    public function calculateBalance(int $walletId): int
    {
        return (int) $this->createQueryBuilder('l')
            ->select('SUM(
                CASE 
                    WHEN l.type = :credit THEN l.amountMinor
                    ELSE -l.amountMinor
                END
            )')
            ->setParameter('credit', 'CREDIT')
            ->andWhere('l.wallet = :wallet')
            ->setParameter('wallet', $walletId)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
