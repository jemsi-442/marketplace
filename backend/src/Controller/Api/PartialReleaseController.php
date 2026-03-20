<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Escrow;
use App\Entity\PartialRelease;
use App\Service\PartialReleaseService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/partial-release')]
#[IsGranted('ROLE_ADMIN')]
class PartialReleaseController extends AbstractController
{
    public function __construct(
        private readonly PartialReleaseService $service,
        private readonly EntityManagerInterface $em
    ) {
    }

    #[Route('/release/{id}', name: 'partial_release_release', methods: ['POST'])]
    public function release(PartialRelease $partialRelease): JsonResponse
    {
        try {
            $success = $this->service->release($partialRelease);
            if (!$success) {
                return $this->json(['message' => 'Milestone already released'], 400);
            }

            return $this->json([
                'message' => 'Milestone released successfully',
                'milestone' => $partialRelease->getMilestone(),
                'amount_minor' => $partialRelease->getAmountMinor(),
                'currency' => $partialRelease->getCurrency(),
            ]);
        } catch (\LogicException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/release-all/{escrowId}', name: 'partial_release_release_all', methods: ['POST'])]
    public function releaseAll(int $escrowId): JsonResponse
    {
        $escrow = $this->em->getRepository(Escrow::class)->find($escrowId);
        if (!$escrow) {
            return $this->json(['error' => 'Escrow not found'], 404);
        }

        $count = $this->service->releaseAllPending($escrow);

        return $this->json(['message' => "$count milestones released"]);
    }
}
