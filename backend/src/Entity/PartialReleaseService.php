<?php

namespace App\Service;

use App\Entity\PartialRelease;
use App\Entity\Escrow;
use Doctrine\ORM\EntityManagerInterface;

class PartialReleaseService
{
    public function __construct(private EntityManagerInterface $em) {}

    public function release(PartialRelease $partialRelease): bool
    {
        if ($partialRelease->isReleased()) {
            return false; // Already released
        }

        $escrow = $partialRelease->getEscrow();
        $totalReleased = $escrow->getReleasedAmount() + $partialRelease->getAmount();

        if ($totalReleased > $escrow->getAmount()) {
            throw new \LogicException("Cannot release more than escrow amount");
        }

        // Update escrow released amount
        $escrow->setReleasedAmount($totalReleased);

        // Mark milestone as released
        $partialRelease->setReleased(true);

        $this->em->persist($escrow);
        $this->em->persist($partialRelease);
        $this->em->flush();

        return true;
    }

    public function releaseAllPending(Escrow $escrow): int
    {
        $count = 0;
        foreach ($escrow->getPartialReleases() as $pr) {
            if (!$pr->isReleased()) {
                $this->release($pr);
                $count++;
            }
        }
        return $count;
    }
}
