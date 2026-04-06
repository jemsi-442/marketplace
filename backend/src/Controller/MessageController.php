<?php

namespace App\Controller;

use App\Controller\Concerns\ListQueryParamsTrait;
use App\Entity\Booking;
use App\Entity\ClientRequest;
use App\Entity\Message;
use App\Entity\Notification;
use App\Entity\User;
use App\Entity\VendorRequestInterest;
use App\Repository\MessageRepository;
use App\Repository\UserRepository;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/messages')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class MessageController extends AbstractController
{
    use ListQueryParamsTrait;

    private const MAX_MESSAGE_LENGTH = 2000;

    public function __construct(
        #[Autowire(service: 'limiter.message_send')]
        private readonly RateLimiterFactory $messageSendLimiter,
    ) {
    }

    private function readThreadFilter(Request $request): string
    {
        return $this->readEnumFilter($request, ['all', 'request', 'booking', 'unread'], 'all', 'view', 'thread_filter');
    }

    private function maskUserLabel(User $user): string
    {
        if ($this->isAdmin($user)) {
            return 'WOLFIX Admin';
        }

        $email = strtolower(trim($user->getEmail()));
        $localPart = strtok($email, '@');
        $localPart = is_string($localPart) ? $localPart : 'user';
        $prefix = mb_substr($localPart, 0, min(3, max(1, mb_strlen($localPart))));

        return sprintf('%s*** (#%d)', $prefix, $user->getId() ?? 0);
    }

    private function isAdmin(User $user): bool
    {
        $roles = $user->getRoles();

        return in_array('ROLE_ADMIN', $roles, true) || in_array('ROLE_SUPER_ADMIN', $roles, true);
    }

    private function resolveCoordinatorAdmin(UserRepository $userRepo, ?User $preferredAdmin = null): ?User
    {
        if ($preferredAdmin instanceof User && $this->isAdmin($preferredAdmin)) {
            return $preferredAdmin;
        }

        /** @var User|null $admin */
        $admin = $userRepo->createQueryBuilder('u')
            ->where('u.roles LIKE :adminRole')
            ->orWhere('u.roles LIKE :superAdminRole')
            ->setParameter('adminRole', '%ROLE_ADMIN%')
            ->setParameter('superAdminRole', '%ROLE_SUPER_ADMIN%')
            ->orderBy('u.id', 'ASC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        return $admin;
    }

    private function canViewRequestThread(User $user, ClientRequest $clientRequest, EntityManagerInterface $em): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        if ($clientRequest->getClient()->getId() === $user->getId()) {
            return true;
        }

        if (!in_array('ROLE_VENDOR', $user->getRoles(), true) || $user->getVendorProfile() === null) {
            return false;
        }

        $interest = $em->getRepository(VendorRequestInterest::class)->findOneBy([
            'clientRequest' => $clientRequest,
            'vendor' => $user->getVendorProfile(),
        ]);

        return $interest instanceof VendorRequestInterest;
    }

    private function canViewBookingThread(User $user, Booking $booking): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        if ($booking->getClient()->getId() === $user->getId()) {
            return true;
        }

        return $booking->resolveVendorUser()?->getId() === $user->getId();
    }

    private function serializeMessage(Message $message): array
    {
        $sender = $message->getSender();
        $receiver = $message->getReceiver();

        return [
            'id' => $message->getId(),
            'senderId' => $sender->getId(),
            'senderLabel' => $this->maskUserLabel($sender),
            'receiverId' => $receiver->getId(),
            'receiverLabel' => $this->maskUserLabel($receiver),
            'content' => $message->getContent(),
            'clientRequestId' => $message->getClientRequest()?->getId(),
            'bookingId' => $message->getBooking()?->getId(),
            'readAt' => $message->getReadAt()?->format('Y-m-d H:i:s'),
            'createdAt' => $message->getCreatedAt()->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAdminParticipant(User $participant): array
    {
        return [
            'id' => $participant->getId(),
            'email' => $participant->getEmail(),
            'roles' => $participant->getRoles(),
            'company_name' => $participant->getVendorProfile()?->getCompanyName(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function makeThreadSummaryItem(
        string $kind,
        int $id,
        string $title,
        string $subtitle,
        string $status,
        int $unreadCount,
        string $preview,
        string $href,
        ?int $participantId = null,
        ?string $activityAt = null
    ): array {
        return [
            'thread_key' => sprintf('%s:%d', $kind, $id),
            'kind' => $kind,
            'id' => $id,
            'title' => $title,
            'subtitle' => $subtitle,
            'status' => $status,
            'unread_count' => $unreadCount,
            'preview' => mb_substr($preview, 0, 180),
            'href' => $href,
            'participant_id' => $participantId,
            'activity_at' => $activityAt,
        ];
    }

    private function formatThreadActivityAt(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }

        return (string) $value;
    }

    /**
     * @param array<int, array<string, mixed>> $items
     * @return array<string, int>
     */
    private function summarizeThreadBuckets(array $requestItems, array $bookingItems): array
    {
        return [
            'total' => count($requestItems) + count($bookingItems),
            'requests' => count($requestItems),
            'bookings' => count($bookingItems),
            'unread' => $this->countUnreadThreadItems($requestItems) + $this->countUnreadThreadItems($bookingItems),
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $items
     */
    private function countUnreadThreadItems(array $items): int
    {
        return count(array_filter($items, static fn (array $item): bool => (int) $item['unread_count'] > 0));
    }

    /**
     * @param array<int, array<string, mixed>> $requestItems
     * @param array<int, array<string, mixed>> $bookingItems
     * @return array<int, array<string, mixed>>
     */
    private function selectThreadItemsForView(array $requestItems, array $bookingItems, string $threadFilter): array
    {
        if ($threadFilter === 'request') {
            return $this->sortThreadItemsByActivity($requestItems);
        }

        if ($threadFilter === 'booking') {
            return $this->sortThreadItemsByActivity($bookingItems);
        }

        if ($threadFilter === 'unread') {
            return $this->sortThreadItemsByActivity([
                ...array_values(array_filter($requestItems, static fn (array $item): bool => (int) $item['unread_count'] > 0)),
                ...array_values(array_filter($bookingItems, static fn (array $item): bool => (int) $item['unread_count'] > 0)),
            ]);
        }

        return $this->sortThreadItemsByActivity([...$requestItems, ...$bookingItems]);
    }

    private function applyClientRequestThreadSearch(QueryBuilder $qb, string $rootAlias, string $serviceAlias, string $search): void
    {
        $normalizedSearch = trim(mb_strtolower($search));
        if ($normalizedSearch === '') {
            return;
        }

        $qb->andWhere(sprintf(
            'LOWER(%1$s.requestSummary) LIKE :threadSearch
                OR LOWER(COALESCE(%1$s.scopeDetails, \'\')) LIKE :threadSearch
                OR LOWER(COALESCE(%1$s.adminAssignmentNote, \'\')) LIKE :threadSearch
                OR LOWER(%1$s.status) LIKE :threadSearch
                OR LOWER(%2$s.name) LIKE :threadSearch
                OR LOWER(%2$s.slug) LIKE :threadSearch
                OR LOWER(COALESCE(%2$s.category, \'\')) LIKE :threadSearch',
            $rootAlias,
            $serviceAlias
        ))->setParameter('threadSearch', sprintf('%%%s%%', $normalizedSearch));
    }

    private function applyBookingThreadSearch(QueryBuilder $qb, string $bookingAlias, string $search): void
    {
        $normalizedSearch = trim(mb_strtolower($search));
        if ($normalizedSearch === '') {
            return;
        }

        $qb->andWhere(sprintf(
            'LOWER(COALESCE(%1$s.requestSummary, \'\')) LIKE :threadSearch
                OR LOWER(COALESCE(%1$s.status, \'\')) LIKE :threadSearch
                OR LOWER(COALESCE(%1$s.serviceTitleSnapshot, \'\')) LIKE :threadSearch
                OR LOWER(COALESCE(%1$s.serviceCategorySnapshot, \'\')) LIKE :threadSearch',
            $bookingAlias
        ))->setParameter('threadSearch', sprintf('%%%s%%', $normalizedSearch));
    }

    /**
     * @param array<int, array<string, mixed>> $items
     * @return array<int, array<string, mixed>>
     */
    private function sortThreadItemsByActivity(array $items): array
    {
        usort($items, static function (array $left, array $right): int {
            $leftActivity = (string) ($left['activity_at'] ?? '');
            $rightActivity = (string) ($right['activity_at'] ?? '');

            if ($leftActivity === $rightActivity) {
                return strcmp((string) ($right['thread_key'] ?? ''), (string) ($left['thread_key'] ?? ''));
            }

            return strcmp($rightActivity, $leftActivity);
        });

        return $items;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function normalizeThreadSummaryRows(array $rows): array
    {
        return array_map(static fn (array $row): array => [
            'thread_key' => (string) ($row['thread_key'] ?? ''),
            'kind' => (string) ($row['kind'] ?? ''),
            'id' => (int) ($row['id'] ?? 0),
            'title' => (string) ($row['title'] ?? ''),
            'subtitle' => (string) ($row['subtitle'] ?? ''),
            'status' => (string) ($row['status'] ?? ''),
            'unread_count' => (int) ($row['unread_count'] ?? 0),
            'preview' => mb_substr((string) ($row['preview'] ?? ''), 0, 180),
            'href' => (string) ($row['href'] ?? ''),
            'participant_id' => isset($row['participant_id']) ? (int) $row['participant_id'] : null,
            'activity_at' => (string) ($row['activity_at'] ?? ''),
        ], $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildClientRequestThreadItems(User $user, EntityManagerInterface $em, MessageRepository $repo, string $search = ''): array
    {
        $requestItems = [];
        $requestQuery = $em->getRepository(ClientRequest::class)->createQueryBuilder('cr')
            ->select('cr.id AS request_id', 'cr.requestSummary AS request_summary', 'cr.adminAssignmentNote AS admin_assignment_note', 'cr.status AS request_status', 'cr.updatedAt AS updated_at', 'st.name AS service_type_name')
            ->join('cr.serviceType', 'st')
            ->where('cr.client = :client')
            ->setParameter('client', $user)
            ->orderBy('cr.createdAt', 'DESC');
        $this->applyClientRequestThreadSearch($requestQuery, 'cr', 'st', $search);
        $requests = $requestQuery->getQuery()->getArrayResult();

        $requestIds = array_values(array_filter(array_map(
            static fn (array $clientRequest): int => (int) ($clientRequest['request_id'] ?? 0),
            $requests
        )));
        $requestUnreadMap = $repo->countUnreadForClientRequestIds($user, $requestIds);
        $requestLastMessageMap = $repo->findLatestVisibleRequestMessageMetaByThreadIds(
            $user,
            $requestIds
        );

        foreach ($requests as $clientRequest) {
            $requestId = (int) ($clientRequest['request_id'] ?? 0);
            if ($requestId <= 0) {
                continue;
            }

            $lastMessageMeta = $requestLastMessageMap[$requestId] ?? null;

            $requestItems[] = $this->makeThreadSummaryItem(
                'request',
                $requestId,
                (string) ($clientRequest['service_type_name'] ?? ''),
                'WOLFIX request coordination',
                (string) ($clientRequest['request_status'] ?? ''),
                $requestUnreadMap[$requestId] ?? 0,
                $lastMessageMeta['preview'] ?? ((string) (($clientRequest['admin_assignment_note'] ?? '') ?: ($clientRequest['request_summary'] ?? ''))),
                sprintf('/dashboard/requests/%d', $requestId),
                null,
                $lastMessageMeta['created_at'] ?? $this->formatThreadActivityAt($clientRequest['updated_at'] ?? '')
            );
        }

        return $requestItems;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildClientBookingThreadItems(User $user, EntityManagerInterface $em, MessageRepository $repo, string $search = ''): array
    {
        $bookingItems = [];
        $bookingQuery = $em->getRepository(Booking::class)->createQueryBuilder('b')
            ->select('b.id AS booking_id', 'b.status AS booking_status', 'b.requestSummary AS request_summary', 'b.serviceTitleSnapshot AS service_title_snapshot', 'b.updatedAt AS updated_at')
            ->where('b.client = :client')
            ->setParameter('client', $user)
            ->orderBy('b.createdAt', 'DESC');
        $this->applyBookingThreadSearch($bookingQuery, 'b', $search);
        $bookings = $bookingQuery->getQuery()->getArrayResult();

        $bookingIds = array_values(array_filter(array_map(
            static fn (array $booking): int => (int) ($booking['booking_id'] ?? 0),
            $bookings
        )));
        $bookingUnreadMap = $repo->countUnreadForBookingIds($user, $bookingIds);
        $bookingLastMessageMap = $repo->findLatestVisibleBookingMessageMetaByThreadIds(
            $user,
            $bookingIds
        );

        foreach ($bookings as $booking) {
            $bookingId = (int) ($booking['booking_id'] ?? 0);
            if ($bookingId <= 0) {
                continue;
            }

            $lastMessageMeta = $bookingLastMessageMap[$bookingId] ?? null;

            $bookingItems[] = $this->makeThreadSummaryItem(
                'booking',
                $bookingId,
                (string) (($booking['service_title_snapshot'] ?? '') ?: sprintf('Booking #%d', $bookingId)),
                'WOLFIX booking coordination',
                (string) ($booking['booking_status'] ?? ''),
                $bookingUnreadMap[$bookingId] ?? 0,
                $lastMessageMeta['preview'] ?? (string) ($booking['request_summary'] ?? ''),
                sprintf('/dashboard/bookings/%d', $bookingId),
                null,
                $lastMessageMeta['created_at'] ?? $this->formatThreadActivityAt($booking['updated_at'] ?? '')
            );
        }

        return $bookingItems;
    }

    /**
     * @return array{request: array<int, array<string, mixed>>, booking: array<int, array<string, mixed>>}
     */
    private function buildClientThreadBuckets(User $user, EntityManagerInterface $em, MessageRepository $repo, string $search = ''): array
    {
        return [
            'request' => $this->buildClientRequestThreadItems($user, $em, $repo, $search),
            'booking' => $this->buildClientBookingThreadItems($user, $em, $repo, $search),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildVendorRequestThreadItems(User $user, EntityManagerInterface $em, MessageRepository $repo, string $search = ''): array
    {
        if ($user->getVendorProfile() === null) {
            return [];
        }

        $requestItems = [];
        $interestQuery = $em->getRepository(VendorRequestInterest::class)->createQueryBuilder('vri')
            ->select('cr.id AS request_id', 'cr.requestSummary AS request_summary', 'cr.status AS request_status', 'cr.updatedAt AS updated_at', 'st.name AS service_type_name', 'vri.status AS interest_status')
            ->join('vri.clientRequest', 'cr')
            ->join('cr.serviceType', 'st')
            ->where('vri.vendor = :vendor')
            ->setParameter('vendor', $user->getVendorProfile())
            ->orderBy('vri.submittedAt', 'DESC');
        $this->applyClientRequestThreadSearch($interestQuery, 'cr', 'st', $search);
        $interests = $interestQuery->getQuery()->getArrayResult();

        $requestIds = array_values(array_filter(array_map(
            static fn (array $interest): int => (int) ($interest['request_id'] ?? 0),
            $interests
        )));
        $requestUnreadMap = $repo->countUnreadForClientRequestIds($user, $requestIds);
        $requestLastMessageMap = $repo->findLatestVisibleRequestMessageMetaByThreadIds(
            $user,
            $requestIds
        );

        foreach ($interests as $interest) {
            $requestId = (int) ($interest['request_id'] ?? 0);
            if ($requestId <= 0) {
                continue;
            }

            $lastMessageMeta = $requestLastMessageMap[$requestId] ?? null;
            $requestItems[] = $this->makeThreadSummaryItem(
                'request',
                $requestId,
                (string) ($interest['service_type_name'] ?? ''),
                'Admin request coordination',
                (string) (($interest['interest_status'] ?? '') ?: ($interest['request_status'] ?? '')),
                $requestUnreadMap[$requestId] ?? 0,
                $lastMessageMeta['preview'] ?? (string) ($interest['request_summary'] ?? ''),
                sprintf('/dashboard/vendor-requests/%d', $requestId),
                null,
                $lastMessageMeta['created_at'] ?? $this->formatThreadActivityAt($interest['updated_at'] ?? '')
            );
        }

        return $requestItems;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildVendorBookingThreadItems(User $user, EntityManagerInterface $em, MessageRepository $repo, string $search = ''): array
    {
        if ($user->getVendorProfile() === null) {
            return [];
        }

        $bookingItems = [];
        $bookingQuery = $em->getRepository(Booking::class)->createQueryBuilder('b')
            ->select('b.id AS booking_id', 'b.status AS booking_status', 'b.requestSummary AS request_summary', 'b.serviceTitleSnapshot AS service_title_snapshot', 'b.updatedAt AS updated_at')
            ->leftJoin('b.clientRequest', 'cr')
            ->leftJoin('cr.selectedVendor', 'sv')
            ->leftJoin('sv.user', 'svu')
            ->where('(svu = :vendorUser OR b.assignedVendor = :vendorUser)')
            ->setParameter('vendorUser', $user)
            ->orderBy('b.createdAt', 'DESC');
        $this->applyBookingThreadSearch($bookingQuery, 'b', $search);
        $bookings = $bookingQuery->getQuery()->getArrayResult();

        $bookingIds = array_values(array_filter(array_map(
            static fn (array $booking): int => (int) ($booking['booking_id'] ?? 0),
            $bookings
        )));
        $bookingUnreadMap = $repo->countUnreadForBookingIds($user, $bookingIds);
        $bookingLastMessageMap = $repo->findLatestVisibleBookingMessageMetaByThreadIds(
            $user,
            $bookingIds
        );

        foreach ($bookings as $booking) {
            $bookingId = (int) ($booking['booking_id'] ?? 0);
            if ($bookingId <= 0) {
                continue;
            }

            $lastMessageMeta = $bookingLastMessageMap[$bookingId] ?? null;

            $bookingItems[] = $this->makeThreadSummaryItem(
                'booking',
                $bookingId,
                (string) (($booking['service_title_snapshot'] ?? '') ?: sprintf('Booking #%d', $bookingId)),
                'Admin booking coordination',
                (string) ($booking['booking_status'] ?? ''),
                $bookingUnreadMap[$bookingId] ?? 0,
                $lastMessageMeta['preview'] ?? (string) ($booking['request_summary'] ?? ''),
                sprintf('/dashboard/bookings/%d', $bookingId),
                null,
                $lastMessageMeta['created_at'] ?? $this->formatThreadActivityAt($booking['updated_at'] ?? '')
            );
        }

        return $bookingItems;
    }

    /**
     * @return array{request: array<int, array<string, mixed>>, booking: array<int, array<string, mixed>>}
     */
    private function buildVendorThreadBuckets(User $user, EntityManagerInterface $em, MessageRepository $repo, string $search = ''): array
    {
        if ($user->getVendorProfile() === null) {
            return [
                'request' => [],
                'booking' => [],
            ];
        }

        return [
            'request' => $this->buildVendorRequestThreadItems($user, $em, $repo, $search),
            'booking' => $this->buildVendorBookingThreadItems($user, $em, $repo, $search),
        ];
    }

    private function countClientRequestThreads(User $user, EntityManagerInterface $em): int
    {
        return (int) $em->getRepository(ClientRequest::class)->createQueryBuilder('cr')
            ->select('COUNT(cr.id)')
            ->where('cr.client = :client')
            ->setParameter('client', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }

    private function countClientBookingThreads(User $user, EntityManagerInterface $em): int
    {
        return (int) $em->getRepository(Booking::class)->createQueryBuilder('b')
            ->select('COUNT(b.id)')
            ->where('b.client = :client')
            ->setParameter('client', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }

    private function countVendorRequestThreads(User $user, EntityManagerInterface $em): int
    {
        $vendorProfile = $user->getVendorProfile();
        if ($vendorProfile === null) {
            return 0;
        }

        return (int) $em->getRepository(VendorRequestInterest::class)->createQueryBuilder('vri')
            ->select('COUNT(vri.id)')
            ->where('vri.vendor = :vendor')
            ->setParameter('vendor', $vendorProfile)
            ->getQuery()
            ->getSingleScalarResult();
    }

    private function countVendorBookingThreads(User $user, EntityManagerInterface $em): int
    {
        if ($user->getVendorProfile() === null) {
            return 0;
        }

        return (int) $em->getRepository(Booking::class)->createQueryBuilder('b')
            ->select('COUNT(b.id)')
            ->leftJoin('b.clientRequest', 'cr')
            ->leftJoin('cr.selectedVendor', 'sv')
            ->leftJoin('sv.user', 'svu')
            ->where('(svu = :vendorUser OR b.assignedVendor = :vendorUser)')
            ->setParameter('vendorUser', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @return array{request: array<int, array<string, mixed>>, booking: array<int, array<string, mixed>>}
     */
    private function buildAdminThreadBuckets(MessageRepository $repo, string $search = ''): array
    {
        $user = $this->getUser();
        if (!$user instanceof User || !$this->isAdmin($user)) {
            return [
                'request' => [],
                'booking' => [],
            ];
        }

        $requestUnreadMap = $repo->countUnreadRequestThreadsForAdmin($user);
        $requestItems = array_map(
            fn (array $thread): array => $this->makeThreadSummaryItem(
                'request',
                (int) $thread['request_id'],
                (string) $thread['service_type_name'],
                (string) (($thread['participant_company_name'] ?? '') ?: $thread['participant_email']),
                (string) $thread['request_status'],
                (int) ($requestUnreadMap[sprintf('%d:%d', (int) $thread['request_id'], (int) $thread['participant_id'])] ?? 0),
                (string) $thread['content_preview'],
                sprintf('/dashboard/admin-requests/%d', (int) $thread['request_id']),
                (int) $thread['participant_id'],
                (string) $thread['created_at']
            )
            ,
            $repo->findAdminRequestThreadSummaryRows($user, 400, $search)
        );

        $bookingUnreadMap = $repo->countUnreadBookingThreadsForAdmin($user);
        $bookingItems = array_map(
            fn (array $thread): array => $this->makeThreadSummaryItem(
                'booking',
                (int) $thread['booking_id'],
                sprintf('Booking #%d', (int) $thread['booking_id']),
                (string) (($thread['participant_company_name'] ?? '') ?: $thread['participant_email']),
                (string) $thread['booking_status'],
                (int) ($bookingUnreadMap[sprintf('%d:%d', (int) $thread['booking_id'], (int) $thread['participant_id'])] ?? 0),
                (string) $thread['content_preview'],
                sprintf('/dashboard/bookings/%d', (int) $thread['booking_id']),
                (int) $thread['participant_id'],
                (string) $thread['created_at']
            )
            ,
            $repo->findAdminBookingThreadSummaryRows($user, 400, $search)
        );

        return [
            'request' => $requestItems,
            'booking' => $bookingItems,
        ];
    }

    #[Route('/unread-summary', name: 'message_unread_summary', methods: ['GET'])]
    public function unreadSummary(MessageRepository $repo): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($this->isAdmin($user)) {
            $requestUnread = count($repo->countUnreadRequestThreadsForAdmin($user));
            $bookingUnread = count($repo->countUnreadBookingThreadsForAdmin($user));
        } else {
            $requestUnread = $repo->countUnreadRequestThreadsForUser($user);
            $bookingUnread = $repo->countUnreadBookingThreadsForUser($user);
        }

        return $this->json([
            'request_unread' => $requestUnread,
            'booking_unread' => $bookingUnread,
            'total_unread' => $requestUnread + $bookingUnread,
        ]);
    }

    #[Route('/thread-summaries', name: 'message_thread_summaries', methods: ['GET'])]
    public function threadSummaries(Request $request, MessageRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $page = $this->readPage($request);
        $limit = $this->readListLimit($request, 10, 50);
        $search = $this->readSearch($request);
        $threadFilter = $this->readThreadFilter($request);

        if ($this->isAdmin($user)) {
            $requestCount = $repo->countAdminRequestThreads($user);
            $bookingCount = $repo->countAdminBookingThreads($user);
            $requestUnreadMap = $repo->countUnreadRequestThreadsForAdmin($user);
            $bookingUnreadMap = $repo->countUnreadBookingThreadsForAdmin($user);
            $summary = [
                'total' => $requestCount + $bookingCount,
                'requests' => $requestCount,
                'bookings' => $bookingCount,
                'unread' => count($requestUnreadMap) + count($bookingUnreadMap),
            ];

            if ($search === '') {
                if ($threadFilter === 'all' || $threadFilter === 'unread') {
                    $totalItems = $threadFilter === 'unread' ? $summary['unread'] : $summary['total'];
                    [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);
                    $offset = max(0, ($page - 1) * $limit);

                    return $this->json([
                        'items' => $this->normalizeThreadSummaryRows($repo->findAdminThreadSummaryPageRows(
                            $user,
                            $limit,
                            $offset,
                            $threadFilter === 'unread'
                        )),
                        'page' => $page,
                        'page_size' => $limit,
                        'total_items' => $totalItems,
                        'total_pages' => $totalPages,
                        'summary' => $summary,
                    ]);
                }

                if ($threadFilter === 'request' || $threadFilter === 'booking') {
                    $totalItems = $threadFilter === 'request' ? $summary['requests'] : $summary['bookings'];
                    [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);
                    $offset = max(0, ($page - 1) * $limit);

                    return $this->json([
                        'items' => $this->normalizeThreadSummaryRows(
                            $threadFilter === 'request'
                                ? $repo->findAdminRequestThreadSummaryPageRows($user, $limit, $offset)
                                : $repo->findAdminBookingThreadSummaryPageRows($user, $limit, $offset)
                        ),
                        'page' => $page,
                        'page_size' => $limit,
                        'total_items' => $totalItems,
                        'total_pages' => $totalPages,
                        'summary' => $summary,
                    ]);
                }
            }

            $threadBuckets = $this->buildAdminThreadBuckets($repo, $search);
            $summary = $this->summarizeThreadBuckets($threadBuckets['request'], $threadBuckets['booking']);
        } elseif (in_array('ROLE_VENDOR', $user->getRoles(), true)) {
            $requestCount = $this->countVendorRequestThreads($user, $em);
            $bookingCount = $this->countVendorBookingThreads($user, $em);
            $requestUnread = $repo->countUnreadRequestThreadsForUser($user);
            $bookingUnread = $repo->countUnreadBookingThreadsForUser($user);
            $summary = [
                'total' => $requestCount + $bookingCount,
                'requests' => $requestCount,
                'bookings' => $bookingCount,
                'unread' => $requestUnread + $bookingUnread,
            ];

            if ($search === '' && in_array($threadFilter, ['all', 'unread'], true)) {
                $totalItems = $threadFilter === 'unread' ? $summary['unread'] : $summary['total'];
                [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);
                $offset = max(0, ($page - 1) * $limit);

                return $this->json([
                    'items' => $this->normalizeThreadSummaryRows($repo->findVendorThreadSummaryPageRows(
                        $user,
                        $limit,
                        $offset,
                        $threadFilter === 'unread'
                    )),
                    'page' => $page,
                    'page_size' => $limit,
                    'total_items' => $totalItems,
                    'total_pages' => $totalPages,
                    'summary' => $summary,
                ]);
            }

            if ($search === '' && in_array($threadFilter, ['request', 'booking'], true)) {
                $threadBuckets = [
                    'request' => $threadFilter === 'request' ? $this->buildVendorRequestThreadItems($user, $em, $repo) : [],
                    'booking' => $threadFilter === 'booking' ? $this->buildVendorBookingThreadItems($user, $em, $repo) : [],
                ];
            } else {
                $threadBuckets = $this->buildVendorThreadBuckets($user, $em, $repo, $search);
                $summary = $this->summarizeThreadBuckets($threadBuckets['request'], $threadBuckets['booking']);
            }
        } else {
            $requestCount = $this->countClientRequestThreads($user, $em);
            $bookingCount = $this->countClientBookingThreads($user, $em);
            $requestUnread = $repo->countUnreadRequestThreadsForUser($user);
            $bookingUnread = $repo->countUnreadBookingThreadsForUser($user);
            $summary = [
                'total' => $requestCount + $bookingCount,
                'requests' => $requestCount,
                'bookings' => $bookingCount,
                'unread' => $requestUnread + $bookingUnread,
            ];

            if ($search === '' && in_array($threadFilter, ['all', 'unread'], true)) {
                $totalItems = $threadFilter === 'unread' ? $summary['unread'] : $summary['total'];
                [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);
                $offset = max(0, ($page - 1) * $limit);

                return $this->json([
                    'items' => $this->normalizeThreadSummaryRows($repo->findClientThreadSummaryPageRows(
                        $user,
                        $limit,
                        $offset,
                        $threadFilter === 'unread'
                    )),
                    'page' => $page,
                    'page_size' => $limit,
                    'total_items' => $totalItems,
                    'total_pages' => $totalPages,
                    'summary' => $summary,
                ]);
            }

            if ($search === '' && in_array($threadFilter, ['request', 'booking'], true)) {
                $threadBuckets = [
                    'request' => $threadFilter === 'request' ? $this->buildClientRequestThreadItems($user, $em, $repo) : [],
                    'booking' => $threadFilter === 'booking' ? $this->buildClientBookingThreadItems($user, $em, $repo) : [],
                ];
            } else {
                $threadBuckets = $this->buildClientThreadBuckets($user, $em, $repo, $search);
                $summary = $this->summarizeThreadBuckets($threadBuckets['request'], $threadBuckets['booking']);
            }
        }

        $filteredItems = $this->selectThreadItemsForView($threadBuckets['request'], $threadBuckets['booking'], $threadFilter);
        $totalItems = count($filteredItems);
        [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);
        $offset = max(0, ($page - 1) * $limit);

        return $this->json([
            'items' => array_slice($filteredItems, $offset, $limit),
            'page' => $page,
            'page_size' => $limit,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
            'summary' => $summary,
        ]);
    }

    #[Route('/client-requests/{id}', name: 'message_request_thread', methods: ['GET'])]
    public function requestThread(ClientRequest $clientRequest, MessageRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->canViewRequestThread($user, $clientRequest, $em)) {
            return $this->json(['error' => 'You cannot view this request thread'], 403);
        }

        $qb = $repo->createQueryBuilder('m')
            ->where('m.clientRequest = :clientRequest')
            ->setParameter('clientRequest', $clientRequest)
            ->orderBy('m.createdAt', 'ASC');

        if (!$this->isAdmin($user)) {
            $qb->andWhere('(m.sender = :user OR m.receiver = :user)')
                ->setParameter('user', $user);
        }

        /** @var array<int, Message> $messages */
        $messages = $qb->getQuery()->getResult();

        $markedRead = false;
        foreach ($messages as $message) {
            if ($message->getReceiver()->getId() === $user->getId() && $message->getReadAt() === null) {
                $message->markRead();
                $markedRead = true;
            }
        }

        if ($markedRead) {
            $em->flush();
        }

        return $this->json([
            'messages' => array_map(fn (Message $message): array => $this->serializeMessage($message), $messages),
        ]);
    }

    #[Route('/client-requests/{id}', name: 'message_request_thread_send', methods: ['POST'])]
    public function sendToRequestThread(
        ClientRequest $clientRequest,
        Request $request,
        EntityManagerInterface $em,
        UserRepository $userRepo,
        NotificationService $notificationService
    ): JsonResponse {
        $sender = $this->getUser();
        if (!$sender instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->canViewRequestThread($sender, $clientRequest, $em)) {
            return $this->json(['error' => 'You cannot post in this request thread'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $receiverId = isset($data['receiverId']) ? (int) $data['receiverId'] : 0;
        $content = isset($data['content']) && is_string($data['content']) ? trim($data['content']) : '';

        if ($content === '') {
            return $this->json(['error' => 'content is required'], 400);
        }
        if (mb_strlen($content) > self::MAX_MESSAGE_LENGTH) {
            return $this->json(['error' => sprintf('Message must not exceed %d characters', self::MAX_MESSAGE_LENGTH)], 400);
        }

        if ($this->isAdmin($sender)) {
            if ($receiverId <= 0) {
                return $this->json(['error' => 'receiverId is required for admin replies'], 400);
            }

            $receiver = $userRepo->find($receiverId);
            if (!$receiver instanceof User) {
                return $this->json(['error' => 'Receiver not found'], 404);
            }

            if (!$this->canViewRequestThread($receiver, $clientRequest, $em) || $this->isAdmin($receiver)) {
                return $this->json(['error' => 'Admin can only message a valid non-admin request participant'], 403);
            }
        } else {
            $receiver = $receiverId > 0
                ? $userRepo->find($receiverId)
                : $this->resolveCoordinatorAdmin($userRepo, $clientRequest->getAssignedByAdmin());

            if (!$receiver instanceof User) {
                return $this->json(['error' => 'No WOLFIX admin coordinator is available for this request right now.'], 503);
            }

            if (!$this->isAdmin($receiver)) {
                return $this->json(['error' => 'Request communication must go through WOLFIX admin coordination.'], 403);
            }
        }

        $limiter = $this->messageSendLimiter->create(sprintf('%d|%s', $sender->getId() ?? 0, $request->getClientIp() ?? 'unknown'));
        if (!$limiter->consume()->isAccepted()) {
            return $this->json(['error' => 'Too many messages sent too quickly. Please slow down.'], 429);
        }

        $message = new Message();
        $message->setSender($sender);
        $message->setReceiver($receiver);
        $message->setClientRequest($clientRequest);
        $message->setContent($content);

        $em->persist($message);
        $em->flush();

        $notificationService->notify(
            $receiver,
            'New request thread message',
            'You received a new platform-managed request update.',
            Notification::CATEGORY_MESSAGE
        );

        return $this->json([
            'message' => 'Thread message sent successfully',
            'data' => $this->serializeMessage($message),
        ], 201);
    }

    #[Route('/bookings/{id}', name: 'message_booking_thread', methods: ['GET'])]
    public function bookingThread(Booking $booking, MessageRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->canViewBookingThread($user, $booking)) {
            return $this->json(['error' => 'You cannot view this booking thread'], 403);
        }

        $qb = $repo->createQueryBuilder('m')
            ->where('m.booking = :booking')
            ->setParameter('booking', $booking)
            ->orderBy('m.createdAt', 'ASC');

        if (!$this->isAdmin($user)) {
            $qb->andWhere('(m.sender = :user OR m.receiver = :user)')
                ->setParameter('user', $user);
        }

        /** @var array<int, Message> $messages */
        $messages = $qb->getQuery()->getResult();

        $markedRead = false;
        foreach ($messages as $message) {
            if ($message->getReceiver()->getId() === $user->getId() && $message->getReadAt() === null) {
                $message->markRead();
                $markedRead = true;
            }
        }

        if ($markedRead) {
            $em->flush();
        }

        return $this->json([
            'messages' => array_map(fn (Message $message): array => $this->serializeMessage($message), $messages),
        ]);
    }

    #[Route('/bookings/{id}', name: 'message_booking_thread_send', methods: ['POST'])]
    public function sendToBookingThread(
        Booking $booking,
        Request $request,
        EntityManagerInterface $em,
        UserRepository $userRepo,
        NotificationService $notificationService
    ): JsonResponse {
        $sender = $this->getUser();
        if (!$sender instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->canViewBookingThread($sender, $booking)) {
            return $this->json(['error' => 'You cannot post in this booking thread'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $receiverId = isset($data['receiverId']) ? (int) $data['receiverId'] : 0;
        $content = isset($data['content']) && is_string($data['content']) ? trim($data['content']) : '';

        if ($content === '') {
            return $this->json(['error' => 'content is required'], 400);
        }
        if (mb_strlen($content) > self::MAX_MESSAGE_LENGTH) {
            return $this->json(['error' => sprintf('Message must not exceed %d characters', self::MAX_MESSAGE_LENGTH)], 400);
        }

        if ($this->isAdmin($sender)) {
            if ($receiverId <= 0) {
                return $this->json(['error' => 'receiverId is required for admin replies'], 400);
            }

            $receiver = $userRepo->find($receiverId);
            if (!$receiver instanceof User) {
                return $this->json(['error' => 'Receiver not found'], 404);
            }

            if (!$this->canViewBookingThread($receiver, $booking) || $this->isAdmin($receiver)) {
                return $this->json(['error' => 'Admin can only message a valid non-admin booking participant'], 403);
            }
        } else {
            $receiver = $receiverId > 0
                ? $userRepo->find($receiverId)
                : $this->resolveCoordinatorAdmin($userRepo, $booking->getClientRequest()?->getAssignedByAdmin());

            if (!$receiver instanceof User) {
                return $this->json(['error' => 'No WOLFIX admin coordinator is available for this booking right now.'], 503);
            }

            if (!$this->isAdmin($receiver)) {
                return $this->json(['error' => 'Booking communication must go through WOLFIX admin coordination.'], 403);
            }
        }

        $limiter = $this->messageSendLimiter->create(sprintf('%d|%s', $sender->getId() ?? 0, $request->getClientIp() ?? 'unknown'));
        if (!$limiter->consume()->isAccepted()) {
            return $this->json(['error' => 'Too many messages sent too quickly. Please slow down.'], 429);
        }

        $message = new Message();
        $message->setSender($sender);
        $message->setReceiver($receiver);
        $message->setBooking($booking);
        $message->setContent($content);

        $em->persist($message);
        $em->flush();

        $notificationService->notify(
            $receiver,
            'New booking thread message',
            'You received a new platform-managed booking update.',
            Notification::CATEGORY_MESSAGE
        );

        return $this->json([
            'message' => 'Thread message sent successfully',
            'data' => $this->serializeMessage($message),
        ], 201);
    }
}
