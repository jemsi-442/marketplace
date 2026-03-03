<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\WalletAccount;
use App\Entity\WalletLedgerEntry;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class WalletLedgerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, WalletLedgerEntry::class);
    }

    public function calculateBalance(WalletAccount $account): int
    {
        $result = $this->createQueryBuilder('l')
            ->select('COALESCE(SUM(CASE WHEN l.entryType = :credit THEN l.amountMinor ELSE -l.amountMinor END), 0) AS balance')
            ->andWhere('l.account = :account')
            ->setParameter('credit', WalletLedgerEntry::ENTRY_CREDIT)
            ->setParameter('account', $account)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result;
    }

    public function hasIdempotencyKey(string $idempotencyKey): bool
    {
        return (bool) $this->createQueryBuilder('l')
            ->select('COUNT(l.id)')
            ->andWhere('l.idempotencyKey = :idempotencyKey')
            ->setParameter('idempotencyKey', $idempotencyKey)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
