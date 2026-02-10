<?php

namespace App\Controller\Api;

use App\Entity\Booking;
use App\Entity\Service;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;


#[Route('/api/bookings')]
final class BookingController extends AbstractController
{
    #[Route('', name: 'booking_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();

        $repo = $em->getRepository(Booking::class);

        if (in_array('ROLE_CLIENT', $user->getRoles())) {
            $bookings = $repo->findBy(['client' => $user]);
        } else {
            // Vendor/Admin sees all bookings
            $bookings = $repo->findAll();
        }

        $result = [];
        foreach ($bookings as $b) {
            $result[] = [
                'id' => $b->getId(),
                'service_id' => $b->getService()?->getId(),
                'service_title' => $b->getService()?->getTitle(),
                'client_id' => $b->getClient()?->getId(),
                'status' => $b->getStatus(),
                'created_at' => $b->getCreatedAt()?->format('Y-m-d H:i:s'),
            ];
        }

        return $this->json($result);
    }

    #[Route('/{id}', name: 'booking_show', methods: ['GET'])]
    public function show(Booking $booking): JsonResponse
    {
        $user = $this->getUser();

        if (in_array('ROLE_CLIENT', $user->getRoles()) && $booking->getClient() !== $user) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        return $this->json([
            'id' => $booking->getId(),
            'service_id' => $booking->getService()?->getId(),
            'service_title' => $booking->getService()?->getTitle(),
            'client_id' => $booking->getClient()?->getId(),
            'status' => $booking->getStatus(),
            'created_at' => $booking->getCreatedAt()?->format('Y-m-d H:i:s'),
        ]);
    }

    #[Route('', name: 'booking_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_CLIENT');

        $data = json_decode($request->getContent(), true);
        $serviceId = $data['service_id'] ?? null;

        if (!$serviceId) {
            return $this->json(['error' => 'service_id is required'], 400);
        }

        $service = $em->getRepository(Service::class)->find($serviceId);
        if (!$service) {
            return $this->json(['error' => 'Service not found'], 404);
        }

        $booking = new Booking();
        $booking->setService($service);
        $booking->setClient($this->getUser());
        $booking->setStatus('PENDING');
        $booking->setCreatedAt(new \DateTimeImmutable());

        $em->persist($booking);
        $em->flush();

        return $this->json([
            'message' => 'Booking created successfully',
            'booking_id' => $booking->getId(),
        ], 201);
    }

    #[Route('/{id}', name: 'booking_update', methods: ['PUT'])]
    public function update(Booking $booking, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();

        if (in_array('ROLE_CLIENT', $user->getRoles()) && $booking->getClient() !== $user) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $status = strtoupper($data['status'] ?? $booking->getStatus());

        $validStatuses = ['PENDING', 'COMPLETED', 'CANCELLED'];
        if (!in_array($status, $validStatuses)) {
            return $this->json(['error' => 'Invalid status'], 400);
        }

        $booking->setStatus($status);
        $em->flush();

        return $this->json([
            'message' => 'Booking updated successfully',
            'booking_id' => $booking->getId(),
        ]);
    }

    #[Route('/{id}', name: 'booking_delete', methods: ['DELETE'])]
    public function delete(Booking $booking, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();

        if (in_array('ROLE_CLIENT', $user->getRoles()) && $booking->getClient() !== $user) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $em->remove($booking);
        $em->flush();

        return $this->json(['message' => 'Booking deleted successfully']);
    }
}
