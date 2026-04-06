<?php

namespace App\Controller\Api;

use App\Entity\Review;
use App\Entity\Booking;
use App\Entity\User;
use App\Security\BookingVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/reviews')]
class ReviewController extends AbstractController
{
    private const MAX_COMMENT_LENGTH = 1500;

    public function __construct(
        #[Autowire(service: 'limiter.review_create')]
        private readonly RateLimiterFactory $reviewCreateLimiter,
    ) {
    }

    #[Route('/vendor/{vendorId}', methods: ['GET'])]
    public function listForVendor(
        int $vendorId,
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $limit = max(1, min((int) $request->query->get('limit', 20), 50));

        /** @var array<int, Review> $reviews */
        $reviews = $em->getRepository(Review::class)->createQueryBuilder('r')
            ->join('r.booking', 'b')
            ->leftJoin('b.assignedVendor', 'av')
            ->leftJoin('b.clientRequest', 'cr')
            ->leftJoin('cr.selectedVendor', 'sv')
            ->leftJoin('sv.user', 'svu')
            ->where('av.id = :vendorId OR svu.id = :vendorId')
            ->setParameter('vendorId', $vendorId)
            ->orderBy('r.createdAt', 'DESC')
            ->setMaxResults($limit)
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

        $commentRaw = $data['comment'] ?? null;
        $comment = is_string($commentRaw) ? trim($commentRaw) : null;
        if ($comment !== null && $comment !== '' && mb_strlen($comment) > self::MAX_COMMENT_LENGTH) {
            return $this->json([
                'error' => sprintf('Comment must not exceed %d characters', self::MAX_COMMENT_LENGTH),
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

        $limiter = $this->reviewCreateLimiter->create(sprintf('%d|%s', $user->getId() ?? 0, $request->getClientIp() ?? 'unknown'));
        if (!$limiter->consume()->isAccepted()) {
            return $this->json([
                'error' => 'Too many review attempts. Please try again later.',
            ], 429);
        }

        $review = new Review();
        $review->setBooking($booking);
        $review->setRating($rating);
        $review->setComment($comment !== '' ? $comment : null);

        $em->persist($review);
        $em->flush();

        return $this->json([
            'message' => 'Review submitted successfully',
            'review' => [
                'id' => $review->getId(),
                'booking_id' => $booking->getId(),
                'rating' => $review->getRating(),
                'comment' => $review->getComment(),
                'created_at' => $review->getCreatedAt()->format('Y-m-d H:i:s'),
            ],
        ], 201);
    }
}
