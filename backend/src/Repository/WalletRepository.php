<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use App\Entity\WalletAccount;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\ParameterType;
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

    /**
     * Concurrency-safe, idempotent account provisioning using a DB upsert.
     * Avoids ORM flush exceptions when multiple workers race to create the same account.
     */
    public function ensureAccountExists(?int $userId, string $type, string $accountCode, string $currency): void
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = <<<'SQL'
INSERT INTO wallet_account (user_id, account_type, account_code, currency, created_at)
VALUES (:user_id, :account_type, :account_code, :currency, NOW())
ON DUPLICATE KEY UPDATE account_code = account_code
SQL;

        $params = [
            'user_id' => $userId,
            'account_type' => strtoupper(trim($type)),
            'account_code' => strtoupper(trim($accountCode)),
            'currency' => strtoupper(trim($currency)),
        ];

        $types = [
            'user_id' => $userId === null ? ParameterType::NULL : ParameterType::INTEGER,
            'account_type' => ParameterType::STRING,
            'account_code' => ParameterType::STRING,
            'currency' => ParameterType::STRING,
        ];

        $conn->executeStatement($sql, $params, $types);
    }
}
