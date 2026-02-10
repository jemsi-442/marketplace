<?php

namespace App\Controller\Api;

use App\Entity\PartialRelease;
use App\Service\PartialReleaseService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/partial-release')]
class PartialReleaseController extends AbstractController
{
    public function __construct(private PartialReleaseService $service, private EntityManagerInterface $em) {}

    #[Route('/release/{id}', name: 'partial_release_release', methods: ['POST'])]
    public function release(PartialRelease $partialRelease): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN'); // Only admin/vendor with permissions

        try {
            $success = $this->service->release($partialRelease);
            if (!$success) {
                return $this->json(['message' => 'Milestone already released'], 400);
            }
            return $this->json([
                'message' => 'Milestone released successfully',
                'milestone' => $partialRelease->getMilestone(),
                'amount' => $partialRelease->getAmount()
            ]);
        } catch (\LogicException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/release-all/{escrowId}', name: 'partial_release_release_all', methods: ['POST'])]
    public function releaseAll(int $escrowId): JsonResponse
    {
        $escrow = $this->em->getRepository('App:Escrow')->find($escrowId);
        if (!$escrow) {
            return $this->json(['error' => 'Escrow not found'], 404);
        }

        $count = $this->service->releaseAllPending($escrow);

        return $this->json(['message' => "$count milestones released"]);
    }
}
