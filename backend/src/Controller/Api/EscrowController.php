<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Repository\EscrowRepository;
use App\Entity\User;
use App\Service\EscrowService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/escrow')]
#[IsGranted('ROLE_ADMIN')]
class EscrowController extends AbstractController
{
    public function __construct(
        private readonly EscrowRepository $escrowRepository,
        private readonly EscrowService $escrowService,
        private readonly EntityManagerInterface $em
    ) {
    }

    #[Route('/resolve/{escrowId}', methods: ['POST'])]
    public function resolve(int $escrowId, Request $request): JsonResponse
    {
        $admin = $this->getUser();
        if (!$admin instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $escrow = $this->escrowRepository->find($escrowId);
        if ($escrow === null) {
            return $this->json(['error' => 'Escrow not found'], 404);
        }

        $payload = json_decode($request->getContent(), true) ?? [];
        $releaseToVendor = (bool) ($payload['release_to_vendor'] ?? false);

        $this->escrowService->resolveDispute(
            escrow: $escrow,
            admin: $admin,
            releaseToVendor: $releaseToVendor,
            metadata: $payload
        );

        return $this->json(['message' => 'Escrow dispute resolved']);
    }

    #[Route('/list', methods: ['GET'])]
    public function listDisputed(): JsonResponse
    {
        $escrows = $this->escrowRepository->findBy(['status' => 'DISPUTED']);
        $data = [];

        foreach ($escrows as $escrow) {
            $data[] = [
                'id' => $escrow->getId(),
                'reference' => $escrow->getReference(),
                'status' => $escrow->getStatus(),
                'amount_minor' => $escrow->getAmountMinor(),
                'currency' => $escrow->getCurrency(),
                'client' => $escrow->getClient()->getEmail(),
                'vendor' => $escrow->getVendor()->getEmail(),
            ];
        }

        return $this->json($data);
    }
}
