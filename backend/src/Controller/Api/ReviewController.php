<?php

namespace App\Controller\Api;

use App\Entity\Review;
use App\Entity\Booking;
use App\Entity\Service;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/reviews')]
class ReviewController extends AbstractController
{
    #[Route('/vendor/{vendorId}', methods: ['GET'])]
    public function listForVendor(
        int $vendorId,
        EntityManagerInterface $em
    ): JsonResponse {
        $reviews = $em->getRepository(Review::class)
            ->findBy(['vendor' => $vendorId], ['createdAt' => 'DESC']);

        return $this->json($reviews);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function create(
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);

        if (
            empty($data['bookingId']) ||
            empty($data['rating'])
        ) {
            return $this->json([
                'error' => 'bookingId and rating are required'
            ], 400);
        }

        if ($data['rating'] < 1 || $data['rating'] > 5) {
            return $this->json([
                'error' => 'Rating must be between 1 and 5'
            ], 400);
        }

        /** @var Booking|null $booking */
        $booking = $em->getRepository(Booking::class)
            ->find($data['bookingId']);

        if (!$booking) {
            return $this->json([
                'error' => 'Booking not found'
            ], 404);
        }

        // 🔐 Booking ownership check
        if ($booking->getClient() !== $user) {
            return $this->json([
                'error' => 'You are not allowed to review this booking'
            ], 403);
        }

        // 🔐 Booking must be completed
        if ($booking->getStatus() !== 'completed') {
            return $this->json([
                'error' => 'Booking not completed'
            ], 400);
        }

        // 🔐 Prevent duplicate review
        $existing = $em->getRepository(Review::class)->findOneBy([
            'booking' => $booking
        ]);

        if ($existing) {
            return $this->json([
                'error' => 'Review already submitted'
            ], 409);
        }

        $vendor = $booking->getVendor();

        // ❌ Vendor cannot review self (extra safety)
        if ($vendor->getUser() === $user) {
            return $this->json([
                'error' => 'You cannot review yourself'
            ], 403);
        }

        $review = new Review();
        $review->setClient($user);
        $review->setVendor($vendor);
        $review->setBooking($booking);
        $review->setRating((int)$data['rating']);
        $review->setComment($data['comment'] ?? null);
        $review->setCreatedAt(new \DateTimeImmutable());

        $em->persist($review);
        $em->flush();

        return $this->json([
            'message' => 'Review submitted successfully'
        ], 201);
    }
}
