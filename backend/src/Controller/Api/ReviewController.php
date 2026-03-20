<?php

namespace App\Controller\Api;

use App\Entity\Review;
use App\Entity\Booking;
use App\Entity\User;
use App\Security\BookingVoter;
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
        /** @var array<int, Review> $reviews */
        $reviews = $em->getRepository(Review::class)->createQueryBuilder('r')
            ->join('r.booking', 'b')
            ->join('b.service', 's')
            ->join('s.vendor', 'vp')
            ->join('vp.user', 'vu')
            ->where('vu.id = :vendorId')
            ->setParameter('vendorId', $vendorId)
            ->orderBy('r.createdAt', 'DESC')
            ->getQuery()
            ->getResult();

        $result = [];
        foreach ($reviews as $review) {
            $booking = $review->getBooking();
            $result[] = [
                'id' => $review->getId(),
                'booking_id' => $booking->getId(),
                'rating' => $review->getRating(),
                'comment' => $review->getComment(),
                'created_at' => $review->getCreatedAt()->format('Y-m-d H:i:s'),
            ];
        }

        return $this->json($result);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function create(
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $bookingId = $data['bookingId'] ?? null;
        $rating = $data['rating'] ?? null;

        if (!is_numeric($bookingId) || !is_numeric($rating)) {
            return $this->json([
                'error' => 'bookingId and rating are required'
            ], 400);
        }

        $rating = (int) $rating;
        if ($rating < 1 || $rating > 5) {
            return $this->json([
                'error' => 'Rating must be between 1 and 5'
            ], 400);
        }

        /** @var Booking|null $booking */
        $booking = $em->getRepository(Booking::class)
            ->find((int) $bookingId);

        if (!$booking) {
            return $this->json([
                'error' => 'Booking not found'
            ], 404);
        }

        if (!$this->isGranted(BookingVoter::REVIEW, $booking)) {
            $statusCode = $booking->getStatus() !== Booking::STATUS_COMPLETED ? 400 : 403;

            return $this->json([
                'error' => $statusCode === 400
                    ? 'Booking not completed'
                    : 'You are not allowed to review this booking'
            ], $statusCode);
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

        $vendorUser = $booking->getService()->getVendor()->getUser();

        $review = new Review();
        $review->setBooking($booking);
        $review->setRating($rating);

        $comment = $data['comment'] ?? null;
        $review->setComment(is_string($comment) ? $comment : null);

        $em->persist($review);
        $em->flush();

        return $this->json([
            'message' => 'Review submitted successfully'
        ], 201);
    }
}
