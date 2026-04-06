<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Concerns\ListQueryParamsTrait;
use App\Entity\Booking;
use App\Entity\Message;
use App\Entity\Notification;
use App\Entity\User;
use App\Repository\MessageRepository;
use App\Security\BookingVoter;
use App\Service\EscrowService;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/bookings')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
final class BookingController extends AbstractController
{
    use ListQueryParamsTrait;

    private const MIN_DISPUTE_REASON_LENGTH = 12;
    private const MAX_DISPUTE_REASON_LENGTH = 500;

    public function __construct(
        private readonly EscrowService $escrowService,
        private readonly NotificationService $notificationService
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeEscrowSummary(?\App\Entity\Escrow $escrow): array
    {
        if ($escrow === null) {
            return [
                'id' => null,
                'reference' => '',
                'status' => '',
                'amount_minor' => 0,
                'currency' => '',
                'disputed_at' => null,
                'resolved_at' => null,
                'dispute_reason' => null,
                'dispute_source' => null,
                'resolution' => null,
                'resolution_note' => null,
                'evidence_summary' => null,
                'tags' => [],
            ];
        }

        $snapshot = $escrow->getExternalStatusSnapshot();
        $tags = [];
        if (is_array($snapshot) && is_array($snapshot['tags'] ?? null)) {
            foreach ($snapshot['tags'] as $tag) {
                if (!is_string($tag)) {
                    continue;
                }

                $normalizedTag = trim($tag);
                if ($normalizedTag === '') {
                    continue;
                }

                $tags[] = $normalizedTag;
            }
        }

        return [
            'id' => $escrow->getId(),
            'reference' => $escrow->getReference(),
            'status' => $escrow->getStatus(),
            'amount_minor' => $escrow->getAmountMinor(),
            'currency' => $escrow->getCurrency(),
            'disputed_at' => $escrow->getDisputedAt()?->format('Y-m-d H:i:s'),
            'resolved_at' => $escrow->getResolvedAt()?->format('Y-m-d H:i:s'),
            'dispute_reason' => is_array($snapshot) && is_string($snapshot['reason'] ?? null) ? trim((string) $snapshot['reason']) : null,
            'dispute_source' => is_array($snapshot) && is_string($snapshot['source'] ?? null) ? trim((string) $snapshot['source']) : null,
            'resolution' => is_array($snapshot) && is_string($snapshot['resolution'] ?? null) ? trim((string) $snapshot['resolution']) : null,
            'resolution_note' => is_array($snapshot) && is_string($snapshot['resolution_note'] ?? null) ? trim((string) $snapshot['resolution_note']) : null,
            'evidence_summary' => is_array($snapshot) && is_string($snapshot['evidence_summary'] ?? null) ? trim((string) $snapshot['evidence_summary']) : null,
            'tags' => array_values(array_unique($tags)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeBooking(Booking $booking, User $viewer, ?int $unreadThreadCount = null): array
    {
        $vendorUser = $booking->resolveVendorUser();
        $escrow = $booking->getEscrow();
        $isAdminViewer = $this->isAdmin($viewer);
        $isVendorViewer = $this->isVendor($viewer);

        $payload = [
            'id' => $booking->getId(),
            'client_request_id' => $booking->getClientRequest()?->getId(),
            'service_title' => $booking->resolveServiceTitle(),
            'service_category' => $booking->resolveServiceCategory(),
            'service_price_cents' => $booking->resolveChargeAmountMinor(),
            'request_summary' => $booking->getRequestSummary(),
            'scope_details' => $booking->getScopeDetails(),
            'deadline_note' => $booking->getDeadlineNote(),
            'assignment_managed_by_platform' => $booking->getClientRequest() !== null,
            'vendor_identity_hidden_from_client' => !$isAdminViewer,
            'vendor_user_id' => $isAdminViewer ? $vendorUser?->getId() : ($isVendorViewer ? $viewer->getId() : null),
            'client_id' => $isAdminViewer ? $booking->getClient()->getId() : ($isVendorViewer ? null : $viewer->getId()),
            'status' => $booking->getStatus(),
            'currency' => $booking->resolveCurrency(),
            'created_at' => $booking->getCreatedAt()->format('Y-m-d H:i:s'),
            'escrow' => $escrow ? $this->serializeEscrowSummary($escrow) : null,
        ];

        if ($unreadThreadCount !== null) {
            $payload['unread_thread_count'] = $unreadThreadCount;
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeEscrowForBooking(Booking $booking): array
    {
        return $this->serializeEscrowSummary($booking->getEscrow());
    }

    private function isAdmin(User $user): bool
    {
        $roles = $user->getRoles();

        return in_array('ROLE_ADMIN', $roles, true) || in_array('ROLE_SUPER_ADMIN', $roles, true);
    }

    private function isVendor(User $user): bool
    {
        return in_array('ROLE_VENDOR', $user->getRoles(), true);
    }

    private function applyViewFilter(\Doctrine\ORM\QueryBuilder $qb, string $view): void
    {
        if ($view === 'active') {
            $qb
                ->andWhere('b.status <> :completedStatus')
                ->setParameter('completedStatus', Booking::STATUS_COMPLETED);

            return;
        }

        if ($view === 'protected') {
            $qb
                ->leftJoin('b.escrow', 'e_filter')
                ->andWhere('e_filter.status = :activeEscrowStatus')
                ->setParameter('activeEscrowStatus', 'ACTIVE');
        }
    }

    private function applyUnreadViewFilter(\Doctrine\ORM\QueryBuilder $qb, User $user): void
    {
        $qb
            ->innerJoin(
                Message::class,
                'm_unread',
                'WITH',
                'm_unread.booking = b AND m_unread.receiver = :unreadReceiver AND m_unread.readAt IS NULL'
            )
            ->setParameter('unreadReceiver', $user);
    }

    private function applySearchFilter(\Doctrine\ORM\QueryBuilder $qb, string $search): void
    {
        $term = trim($search);
        if ($term === '') {
            return;
        }

        $normalized = mb_strtolower($term);
        $like = '%' . $normalized . '%';

        $conditions = [
            'LOWER(b.requestSummary) LIKE :bookingSearch',
            'LOWER(COALESCE(b.scopeDetails, \'\')) LIKE :bookingSearch',
            'LOWER(COALESCE(b.serviceTitleSnapshot, \'\')) LIKE :bookingSearch',
            'LOWER(COALESCE(b.serviceCategorySnapshot, \'\')) LIKE :bookingSearch',
        ];

        if (ctype_digit($term)) {
            $conditions[] = 'b.id = :bookingIdSearch';
            $qb->setParameter('bookingIdSearch', (int) $term);
        }

        $qb
            ->andWhere('(' . implode(' OR ', $conditions) . ')')
            ->setParameter('bookingSearch', $like);
    }

    private function buildVisibleBookingsQueryBuilder(EntityManagerInterface $em, User $user): \Doctrine\ORM\QueryBuilder
    {
        $qb = $em->getRepository(Booking::class)->createQueryBuilder('b')
            ->leftJoin('b.assignedVendor', 'av')
            ->leftJoin('b.clientRequest', 'cr')
            ->leftJoin('cr.selectedVendor', 'sv')
            ->leftJoin('sv.user', 'svu');

        if ($this->isAdmin($user)) {
            return $qb;
        }

        if ($this->isVendor($user)) {
            return $qb
                ->andWhere('(svu = :user OR av = :user)')
                ->setParameter('user', $user);
        }

        return $qb
            ->andWhere('b.client = :user')
            ->setParameter('user', $user);
    }

    #[Route('', name: 'booking_list', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em, MessageRepository $messageRepository): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }
        $limit = $this->readListLimit($request, 10, 50);
        $page = $this->readPage($request);
        $search = $this->readSearch($request);
        $view = $this->readEnumFilter($request, ['all', 'active', 'protected', 'unread']);

        $summaryBaseQb = $this->buildVisibleBookingsQueryBuilder($em, $user);
        $this->applySearchFilter($summaryBaseQb, $search);
        $summary = [
            'total' => (int) (clone $summaryBaseQb)
                ->select('COUNT(DISTINCT b.id)')
                ->getQuery()
                ->getSingleScalarResult(),
            'active' => (int) (clone $summaryBaseQb)
                ->select('COUNT(DISTINCT b.id)')
                ->andWhere('b.status <> :completedStatus')
                ->setParameter('completedStatus', Booking::STATUS_COMPLETED)
                ->getQuery()
                ->getSingleScalarResult(),
            'protected' => (int) (clone $summaryBaseQb)
                ->leftJoin('b.escrow', 'e_summary')
                ->select('COUNT(DISTINCT b.id)')
                ->andWhere('e_summary.status = :activeEscrowStatus')
                ->setParameter('activeEscrowStatus', 'ACTIVE')
                ->getQuery()
                ->getSingleScalarResult(),
            'unread' => $messageRepository->countUnreadBookingThreadsForUser($user),
        ];

        $itemsQb = $this->buildVisibleBookingsQueryBuilder($em, $user);
        $this->applySearchFilter($itemsQb, $search);
        if ($view === 'unread') {
            $this->applyUnreadViewFilter($itemsQb, $user);
        } else {
            $this->applyViewFilter($itemsQb, $view);
        }

        $totalItems = (int) (clone $itemsQb)
            ->select('COUNT(DISTINCT b.id)')
            ->getQuery()
            ->getSingleScalarResult();

        [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);

        /** @var array<int, Booking> $bookings */
        $bookings = $itemsQb
            ->orderBy('b.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        $unreadMap = $messageRepository->countUnreadForBookingIds(
            $user,
            array_values(array_filter(array_map(static fn (Booking $booking): ?int => $booking->getId(), $bookings)))
        );

        $result = [];
        foreach ($bookings as $booking) {
            $result[] = $this->serializeBooking(
                $booking,
                $user,
                $unreadMap[$booking->getId() ?? 0] ?? 0
            );
        }

        return $this->json([
            'items' => $result,
            'page' => $page,
            'page_size' => $limit,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
            'summary' => $summary,
        ]);
    }

    #[Route('/summary', name: 'booking_summary', methods: ['GET'])]
    public function summary(EntityManagerInterface $em, MessageRepository $messageRepository): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $baseQb = $this->buildVisibleBookingsQueryBuilder($em, $user);

        $total = (int) (clone $baseQb)
            ->select('COUNT(DISTINCT b.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $active = (int) (clone $baseQb)
            ->select('COUNT(DISTINCT b.id)')
            ->andWhere('b.status <> :completedStatus')
            ->setParameter('completedStatus', Booking::STATUS_COMPLETED)
            ->getQuery()
            ->getSingleScalarResult();

        $protected = (int) (clone $baseQb)
            ->leftJoin('b.escrow', 'e_summary')
            ->select('COUNT(DISTINCT b.id)')
            ->andWhere('e_summary.status = :activeEscrowStatus')
            ->setParameter('activeEscrowStatus', 'ACTIVE')
            ->getQuery()
            ->getSingleScalarResult();

        return $this->json([
            'total' => $total,
            'active' => $active,
            'protected' => $protected,
            'unread' => $messageRepository->countUnreadBookingThreadsForUser($user),
        ]);
    }

    #[Route('/{id}', name: 'booking_show', methods: ['GET'])]
    public function show(Booking $booking, MessageRepository $messageRepository): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $this->denyAccessUnlessGranted(BookingVoter::VIEW, $booking);

        return $this->json($this->serializeBooking(
            $booking,
            $user,
            $messageRepository->countUnreadForBooking($booking, $user)
        ));
    }

    #[Route('', name: 'booking_create', methods: ['POST'])]
    public function create(): JsonResponse
    {
        return $this->json([
            'error' => 'Direct service bookings were retired. Start from Services, send a request, then open the booking from that request when WOLFIX marks it ready for payment.',
        ], Response::HTTP_GONE);
    }

    #[Route('/{id}', name: 'booking_update', methods: ['PUT'])]
    public function update(Booking $booking, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->isAdmin($user)) {
            return $this->json([
                'error' => 'Booking status changes must go through dedicated workflow actions',
            ], 403);
        }

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

        $amountMinor = $booking->resolveChargeAmountMinor();
        $vendor = $booking->resolveVendorUser();

        if ($amountMinor === null || $amountMinor <= 0) {
            return $this->json(['error' => 'Booking price is not ready for payment'], 409);
        }

        if ($vendor === null) {
            return $this->json(['error' => 'Booking vendor assignment is missing'], 409);
        }

        $escrow = $this->escrowService->createEscrow($booking, $user, $amountMinor, $booking->resolveCurrency());

        $this->notificationService->notifyMany(
            [$user, $vendor],
            'Escrow created',
            sprintf('Escrow %s has been opened for booking #%d.', $escrow->getReference(), $booking->getId()),
            Notification::CATEGORY_ESCROW
        );

        return $this->json([
            'message' => 'Escrow created successfully',
            'booking' => $this->serializeBooking($booking, $user),
            'escrow' => $this->serializeEscrowForBooking($booking),
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
        $this->notificationService->notifyMany(
            [$user, $escrow->getVendor()],
            'Escrow released',
            sprintf('Escrow %s has been released to the vendor.', $escrow->getReference()),
            Notification::CATEGORY_ESCROW
        );

        return $this->json([
            'message' => 'Escrow released successfully',
            'booking' => $this->serializeBooking($booking, $user),
            'escrow' => $this->serializeEscrowForBooking($booking),
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

        $reason = isset($payload['reason']) && is_string($payload['reason']) ? trim($payload['reason']) : '';
        if (mb_strlen($reason) < self::MIN_DISPUTE_REASON_LENGTH) {
            return $this->json([
                'error' => sprintf('reason must be at least %d characters', self::MIN_DISPUTE_REASON_LENGTH),
            ], 400);
        }

        if (mb_strlen($reason) > self::MAX_DISPUTE_REASON_LENGTH) {
            return $this->json([
                'error' => sprintf('reason must not exceed %d characters', self::MAX_DISPUTE_REASON_LENGTH),
            ], 400);
        }

        $this->escrowService->openDispute($escrow, $user, [
            'reason' => $reason,
            'source' => 'CLIENT_DASHBOARD',
        ]);
        $this->notificationService->notifyMany(
            [$user, $escrow->getVendor()],
            'Escrow dispute opened',
            sprintf('Escrow %s is now under dispute review.', $escrow->getReference()),
            Notification::CATEGORY_ESCROW
        );

        return $this->json([
            'message' => 'Escrow dispute opened',
            'booking' => $this->serializeBooking($booking, $user),
            'escrow' => $this->serializeEscrowForBooking($booking),
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
