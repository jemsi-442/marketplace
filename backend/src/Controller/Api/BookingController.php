<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Booking;
use App\Entity\Service;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/bookings')]
final class BookingController extends AbstractController
{
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

        $bookings = $qb->getQuery()->getResult();

        $result = [];
        foreach ($bookings as $booking) {
            $result[] = [
                'id' => $booking->getId(),
                'service_id' => $booking->getService()?->getId(),
                'service_title' => $booking->getService()?->getTitle(),
                'client_id' => $booking->getClient()?->getId(),
                'status' => $booking->getStatus(),
                'created_at' => $booking->getCreatedAt()->format('Y-m-d H:i:s'),
            ];
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

        if (!in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            $isOwner = $booking->getClient()?->getId() === $user->getId();
            $isVendor = $booking->getService()?->getVendor()?->getUser()?->getId() === $user->getId();
            if (!$isOwner && !$isVendor) {
                return $this->json(['error' => 'Access denied'], 403);
            }
        }

        return $this->json([
            'id' => $booking->getId(),
            'service_id' => $booking->getService()?->getId(),
            'service_title' => $booking->getService()?->getTitle(),
            'client_id' => $booking->getClient()?->getId(),
            'status' => $booking->getStatus(),
            'created_at' => $booking->getCreatedAt()->format('Y-m-d H:i:s'),
        ]);
    }

    #[Route('', name: 'booking_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];
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

        if (!in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            $isOwner = $booking->getClient()?->getId() === $user->getId();
            $isVendor = $booking->getService()?->getVendor()?->getUser()?->getId() === $user->getId();
            if (!$isOwner && !$isVendor) {
                return $this->json(['error' => 'Access denied'], 403);
            }
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $statusInput = (string) ($data['status'] ?? $booking->getStatus());
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

    #[Route('/{id}', name: 'booking_delete', methods: ['DELETE'])]
    public function delete(Booking $booking, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            $isOwner = $booking->getClient()?->getId() === $user->getId();
            if (!$isOwner) {
                return $this->json(['error' => 'Access denied'], 403);
            }
        }

        $em->remove($booking);
        $em->flush();

        return $this->json(['message' => 'Booking deleted successfully']);
    }
}

