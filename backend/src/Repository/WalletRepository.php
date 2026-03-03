<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use App\Entity\WalletAccount;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class WalletRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, WalletAccount::class);
    }

    public function findVendorAccount(User $vendor, string $currency): ?WalletAccount
    {
        return $this->findOneBy([
            'user' => $vendor,
            'type' => WalletAccount::TYPE_VENDOR,
            'currency' => strtoupper($currency),
        ]);
    }

    public function findByCode(string $code): ?WalletAccount
    {
        return $this->findOneBy(['accountCode' => strtoupper($code)]);
    }
}
