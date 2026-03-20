<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Escrow;
use App\Entity\PartialRelease;
use Doctrine\ORM\EntityManagerInterface;

final class PartialReleaseService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function release(PartialRelease $partialRelease): bool
    {
        if ($partialRelease->isReleased()) {
            return false;
        }

        $partialRelease->markReleased();
        $this->em->flush();

        return true;
    }

    public function releaseAllPending(Escrow $escrow): int
    {
        $count = 0;

        foreach ($escrow->getPartialReleases() as $release) {
            if (!$release->isReleased()) {
                $release->markReleased();
                $count++;
            }
        }

        $this->em->flush();

        return $count;
    }
}
