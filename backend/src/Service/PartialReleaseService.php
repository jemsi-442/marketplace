<?php

namespace App\Service;

use App\Entity\PartialRelease;
use App\Entity\Escrow;
use Doctrine\ORM\EntityManagerInterface;

final class PartialReleaseService
{
    public function __construct(
        private EntityManagerInterface $em
    ) {}

    public function release(PartialRelease $partialRelease): bool
    {
        if ($partialRelease->isReleased()) {
            return false;
        }

        if (!$partialRelease->canBeReleased()) {
            throw new \LogicException('Milestone cannot be released.');
        }

        $partialRelease->markAsReleased();
        $this->em->flush();

        return true;
    }

    public function releaseAllPending(Escrow $escrow): int
    {
        $count = 0;

        foreach ($escrow->getPartialReleases() as $release) {
            if (!$release->isReleased() && $release->canBeReleased()) {
                $release->markAsReleased();
                $count++;
            }
        }

        $this->em->flush();

        return $count;
    }
}
