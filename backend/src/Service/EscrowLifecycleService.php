<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Escrow;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class EscrowLifecycleService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function transition(Escrow $escrow, string $targetState): void
    {
        $targetState = strtoupper($targetState);

        try {
            match ($targetState) {
                Escrow::STATUS_FUNDED => $escrow->transitionToFunded(
                    externalPaymentReference: $escrow->getReference(),
                    externalTransactionId: $escrow->getExternalTransactionId() ?? ('manual_' . $escrow->getReference()),
                    snapshot: $escrow->getExternalStatusSnapshot() ?? []
                ),
                Escrow::STATUS_ACTIVE => $escrow->transitionToActive(),
                Escrow::STATUS_RELEASED => $escrow->transitionToReleased(),
                Escrow::STATUS_DISPUTED => $escrow->transitionToDisputed(),
                Escrow::STATUS_RESOLVED => $escrow->transitionToResolved(),
                default => throw new BadRequestHttpException('Unsupported escrow transition target: ' . $targetState),
            };
        } catch (\Throwable $e) {
            throw new BadRequestHttpException($e->getMessage(), $e);
        }

        $this->em->flush();
    }
}
