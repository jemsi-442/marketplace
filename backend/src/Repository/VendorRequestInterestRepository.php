<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\VendorProfile;
use App\Entity\VendorRequestInterest;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<VendorRequestInterest>
 */
final class VendorRequestInterestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct(
            registry: $registry,
            entityClass: VendorRequestInterest::class
        );
    }

    /**
     * @param array<int, int> $clientRequestIds
     * @return array<int, VendorRequestInterest>
     */
    public function findMapForVendorByClientRequestIds(VendorProfile $vendor, array $clientRequestIds): array
    {
        if ($clientRequestIds === []) {
            return [];
        }

        $rows = $this->createQueryBuilder('vri')
            ->where('vri.vendor = :vendor')
            ->andWhere('vri.clientRequest IN (:clientRequestIds)')
            ->setParameter('vendor', $vendor)
            ->setParameter('clientRequestIds', array_values(array_unique($clientRequestIds)))
            ->getQuery()
            ->getResult();

        $map = [];
        foreach ($rows as $interest) {
            if (!$interest instanceof VendorRequestInterest) {
                continue;
            }

            $clientRequestId = $interest->getClientRequest()->getId();
            if ($clientRequestId === null) {
                continue;
            }

            $map[$clientRequestId] = $interest;
        }

        return $map;
    }
}
