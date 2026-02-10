<?php

namespace App\Controller\Api;

use App\Entity\Escrow;
use App\Entity\Payment;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/escrow')]
#[IsGranted('ROLE_ADMIN')]
class AdminController extends AbstractController
{
    #[Route('/force-release/{escrowId}', methods: ['POST'])]
    public function forceRelease(
        int $escrowId,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var Escrow|null $escrow */
        $escrow = $em->getRepository(Escrow::class)->find($escrowId);

        if (!$escrow) {
            return $this->json(['error' => 'Escrow not found'], 404);
        }

        if ($escrow->getStatus() !== 'disputed') {
            return $this->json([
                'error' => 'Only disputed escrows can be force released'
            ], 400);
        }

        $escrow->setStatus('released');
        $escrow->setReleasedAt(new \DateTimeImmutable());
        $escrow->setAdminDecision('force_release');

        // Update booking
        $booking = $escrow->getBooking();
        $booking->setStatus('completed');

        $em->flush();

        return $this->json([
            'message' => 'Escrow force-released to vendor by admin'
        ]);
    }

    #[Route('/refund/{escrowId}', methods: ['POST'])]
    public function refund(
        int $escrowId,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var Escrow|null $escrow */
        $escrow = $em->getRepository(Escrow::class)->find($escrowId);

        if (!$escrow) {
            return $this->json(['error' => 'Escrow not found'], 404);
        }

        if ($escrow->getStatus() !== 'disputed') {
            return $this->json([
                'error' => 'Only disputed escrows can be refunded'
            ], 400);
        }

        // Create refund record
        $refund = new Payment();
        $refund->setUser($escrow->getClient());
        $refund->setAmount($escrow->getAmount());
        $refund->setMethod('escrow_refund');
        $refund->setStatus('success');
        $refund->setCreatedAt(new \DateTimeImmutable());

        $escrow->setStatus('refunded');
        $escrow->setAdminDecision('refund');
        $escrow->setResolvedAt(new \DateTimeImmutable());

        // Update booking
        $booking = $escrow->getBooking();
        $booking->setStatus('cancelled');

        $em->persist($refund);
        $em->flush();

        return $this->json([
            'message' => 'Escrow refunded to client by admin'
        ]);
    }

    #[Route('/list', methods: ['GET'])]
    public function listDisputed(EntityManagerInterface $em): JsonResponse
    {
        $escrows = $em->getRepository(Escrow::class)->findBy([
            'status' => 'disputed'
        ]);

        $data = [];

        foreach ($escrows as $escrow) {
            $data[] = [
                'id' => $escrow->getId(),
                'amount' => $escrow->getAmount(),
                'client' => $escrow->getClient()->getEmail(),
                'vendor' => $escrow->getVendor()->getUser()->getEmail(),
                'reason' => $escrow->getDisputeReason(),
                'created_at' => $escrow->getCreatedAt()?->format('Y-m-d H:i')
            ];
        }

        return $this->json($data);
    }
}
