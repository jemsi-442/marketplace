<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Booking;
use App\Entity\Service;
use App\Entity\User;
use App\Security\BookingVoter;
use App\Service\EscrowService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/bookings')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
final class BookingController extends AbstractController
{
    public function __construct(private readonly EscrowService $escrowService)
    {
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeBooking(Booking $booking): array
    {
        $escrow = $booking->getEscrow();

        return [
            'id' => $booking->getId(),
            'service_id' => $booking->getService()->getId(),
            'service_title' => $booking->getService()->getTitle(),
            'client_id' => $booking->getClient()->getId(),
            'status' => $booking->getStatus(),
            'created_at' => $booking->getCreatedAt()->format('Y-m-d H:i:s'),
            'escrow' => $escrow ? [
                'id' => $escrow->getId(),
                'reference' => $escrow->getReference(),
                'status' => $escrow->getStatus(),
                'amount_minor' => $escrow->getAmountMinor(),
                'currency' => $escrow->getCurrency(),
            ] : null,
        ];
    }

    #[Route('', name: 'booking_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $qb = $em->getRepository(Booking::class)->createQueryBuilder('b')
            ->leftJoin('b.service', 's')
            ->leftJoin('s.vendor', 'vp')
            ->leftJoin('vp.user', 'vu')
            ->addSelect('s')
            ->orderBy('b.createdAt', 'DESC');

        if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            // admin sees all
        } elseif (in_array('ROLE_VENDOR', $user->getRoles(), true)) {
            $qb->andWhere('vu = :user')->setParameter('user', $user);
        } else {
            $qb->andWhere('b.client = :user')->setParameter('user', $user);
        }

        /** @var array<int, Booking> $bookings */
        $bookings = $qb->getQuery()->getResult();

        $result = [];
        foreach ($bookings as $booking) {
            $result[] = $this->serializeBooking($booking);
        }

        return $this->json($result);
    }

    #[Route('/{id}', name: 'booking_show', methods: ['GET'])]
    public function show(Booking $booking): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $this->denyAccessUnlessGranted(BookingVoter::VIEW, $booking);

        return $this->json($this->serializeBooking($booking));
    }

    #[Route('', name: 'booking_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $serviceId = $data['service_id'] ?? null;
        if (!$serviceId) {
            return $this->json(['error' => 'service_id is required'], 400);
        }

        $service = $em->getRepository(Service::class)->find($serviceId);
        if (!$service instanceof Service || !$service->isActive()) {
            return $this->json(['error' => 'Service not found'], 404);
        }

        $booking = new Booking();
        $booking->setService($service);
        $booking->setClient($user);
        $booking->setStatus(Booking::STATUS_PENDING);

        $em->persist($booking);
        $em->flush();

        return $this->json([
            'message' => 'Booking created successfully',
            'booking_id' => $booking->getId(),
            'status' => $booking->getStatus(),
        ], 201);
    }

    #[Route('/{id}', name: 'booking_update', methods: ['PUT'])]
    public function update(Booking $booking, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $this->denyAccessUnlessGranted(BookingVoter::UPDATE, $booking);

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $statusValue = $data['status'] ?? $booking->getStatus();
        $statusInput = is_string($statusValue) ? $statusValue : $booking->getStatus();
        $status = strtolower($statusInput);

        $validStatuses = [
            Booking::STATUS_PENDING,
            Booking::STATUS_CONFIRMED,
            Booking::STATUS_COMPLETED,
            Booking::STATUS_CANCELLED,
        ];
        if (!in_array($status, $validStatuses, true)) {
            return $this->json(['error' => 'Invalid status'], 400);
        }

        $booking->setStatus($status);
        $em->flush();

        return $this->json([
            'message' => 'Booking updated successfully',
            'booking_id' => $booking->getId(),
            'status' => $booking->getStatus(),
        ]);
    }

    #[Route('/{id}/escrow', name: 'booking_create_escrow', methods: ['POST'])]
    public function createEscrowForBooking(Booking $booking): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($booking->getClient()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Only booking client can create escrow'], 403);
        }

        if ($booking->getEscrow() !== null) {
            return $this->json(['error' => 'Booking already has an escrow'], 409);
        }

        $service = $booking->getService();
        $escrow = $this->escrowService->createEscrow($booking, $user, $service->getPriceCents(), 'TZS');

        return $this->json([
            'message' => 'Escrow created successfully',
            'escrow' => [
                'id' => $escrow->getId(),
                'reference' => $escrow->getReference(),
                'status' => $escrow->getStatus(),
                'amount_minor' => $escrow->getAmountMinor(),
                'currency' => $escrow->getCurrency(),
            ],
        ], 201);
    }

    #[Route('/{id}/escrow/release', name: 'booking_release_escrow', methods: ['POST'])]
    public function releaseEscrowForBooking(Booking $booking): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($booking->getClient()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Only booking client can release escrow'], 403);
        }

        $escrow = $booking->getEscrow();
        if ($escrow === null) {
            return $this->json(['error' => 'Booking escrow not found'], 404);
        }

        $this->escrowService->releaseByClient($escrow, $user);

        return $this->json([
            'message' => 'Escrow released successfully',
            'escrow_status' => $escrow->getStatus(),
        ]);
    }

    #[Route('/{id}/escrow/dispute', name: 'booking_dispute_escrow', methods: ['POST'])]
    public function disputeEscrowForBooking(Booking $booking, Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($booking->getClient()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Only booking client can dispute escrow'], 403);
        }

        $escrow = $booking->getEscrow();
        if ($escrow === null) {
            return $this->json(['error' => 'Booking escrow not found'], 404);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $reason = isset($payload['reason']) && is_string($payload['reason']) ? $payload['reason'] : 'Client dispute opened from dashboard';

        $this->escrowService->openDispute($escrow, $user, [
            'reason' => $reason,
            'source' => 'CLIENT_DASHBOARD',
        ]);

        return $this->json([
            'message' => 'Escrow dispute opened',
            'escrow_status' => $escrow->getStatus(),
        ]);
    }

    #[Route('/{id}', name: 'booking_delete', methods: ['DELETE'])]
    public function delete(Booking $booking, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $this->denyAccessUnlessGranted(BookingVoter::DELETE, $booking);

        $em->remove($booking);
        $em->flush();

        return $this->json(['message' => 'Booking deleted successfully']);
    }
}
