<?php

namespace App\Service;

use Doctrine\ORM\EntityManagerInterface;
use App\Entity\Escrow;

class EscrowAutoReleaseService
{
    public function __construct(
        private EntityManagerInterface $em
    ) {}

    public function autoRelease(): int
    {
        $released = 0;

        $escrows = $this->em->getRepository(Escrow::class)
            ->createQueryBuilder('e')
            ->where('e.status = :status')
            ->setParameter('status', 'pending')
            ->getQuery()
            ->getResult();

        foreach ($escrows as $escrow) {
            if ($escrow->isEligibleForAutoRelease()) {
                $escrow->setStatus('released');
                $released++;
            }
        }

        $this->em->flush();

        return $released;
    }
}
