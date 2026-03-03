<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Escrow;
use Doctrine\ORM\EntityManagerInterface;

class EscrowAutoReleaseService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function autoRelease(): int
    {
        $released = 0;

        $escrows = $this->em->getRepository(Escrow::class)
            ->createQueryBuilder('e')
            ->where('e.status = :status')
            ->setParameter('status', Escrow::STATUS_ACTIVE)
            ->getQuery()
            ->getResult();

        foreach ($escrows as $escrow) {
            if (!$escrow instanceof Escrow) {
                continue;
            }

            $escrow->transitionToReleased();
            $released++;
        }

        $this->em->flush();

        return $released;
    }
}
