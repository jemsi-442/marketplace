<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Concerns\ListQueryParamsTrait;
use App\Entity\Booking;
use App\Entity\ClientRequest;
use App\Entity\Notification;
use App\Entity\ServiceType;
use App\Entity\User;
use App\Entity\VendorRequestInterest;
use App\Entity\VendorServiceCapability;
use App\Repository\ClientRequestRepository;
use App\Repository\MessageRepository;
use App\Repository\ServiceTypeRepository;
use App\Repository\VendorRequestInterestRepository;
use App\Repository\VendorServiceCapabilityRepository;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/client-requests')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
final class ClientRequestController extends AbstractController
{
    use ListQueryParamsTrait;

    public function __construct(
        #[Autowire(service: 'limiter.client_request_create')]
        private readonly RateLimiterFactory $clientRequestCreateLimiter,
    ) {
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

    private function isClient(User $user): bool
    {
        return !$this->isAdmin($user) && !$this->isVendor($user);
    }

    private function applyStatusViewFilter(\Doctrine\ORM\QueryBuilder $qb, string $statusView): void
    {
        if ($statusView === 'awaiting_payment') {
            $qb
                ->andWhere('cr.status = :awaitingPaymentStatus')
                ->setParameter('awaitingPaymentStatus', ClientRequest::STATUS_AWAITING_PAYMENT);

            return;
        }

        if ($statusView === 'completed') {
            $qb
                ->andWhere('cr.status = :completedStatus')
                ->setParameter('completedStatus', ClientRequest::STATUS_COMPLETED);

            return;
        }

        if ($statusView === 'active') {
            $qb
                ->andWhere('cr.status NOT IN (:inactiveStatuses)')
                ->setParameter('inactiveStatuses', [
                    ClientRequest::STATUS_COMPLETED,
                    ClientRequest::STATUS_CANCELLED,
                ]);
        }
    }

    /**
     * @return array<int, User>
     */
    private function findAdminUsers(EntityManagerInterface $em): array
    {
        /** @var array<int, User> $admins */
        $admins = $em->getRepository(User::class)
            ->createQueryBuilder('u')
            ->where('u.roles LIKE :adminRole')
            ->orWhere('u.roles LIKE :superAdminRole')
            ->setParameter('adminRole', '%ROLE_ADMIN%')
            ->setParameter('superAdminRole', '%ROLE_SUPER_ADMIN%')
            ->getQuery()
            ->getResult();

        return $admins;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeClientRequest(ClientRequest $clientRequest, ?int $unreadThreadCount = null): array
    {
        $serviceType = $clientRequest->getServiceType();

        $payload = [
            'id' => $clientRequest->getId(),
            'service_type' => [
                'id' => $serviceType->getId(),
                'name' => $serviceType->getName(),
                'slug' => $serviceType->getSlug(),
                'category' => $serviceType->getCategory(),
                'requires_admin_assignment' => $serviceType->requiresAdminAssignment(),
            ],
            'request_summary' => $clientRequest->getRequestSummary(),
            'scope_details' => $clientRequest->getScopeDetails(),
            'deadline_note' => $clientRequest->getDeadlineNote(),
            'budget_note' => $clientRequest->getBudgetNote(),
            'attachments_count' => $clientRequest->getAttachmentsCount(),
            'assignment_managed_by_platform' => true,
            'vendor_identity_hidden_from_client' => true,
            'agreed_price_minor' => $clientRequest->getAgreedPriceMinor(),
            'currency' => $clientRequest->getCurrency(),
            'agreed_timeline_note' => $clientRequest->getAgreedTimelineNote(),
            'admin_assignment_note' => $clientRequest->getAdminAssignmentNote(),
            'status' => $clientRequest->getStatus(),
            'submitted_at' => $clientRequest->getSubmittedAt()?->format('Y-m-d H:i:s'),
            'matched_at' => $clientRequest->getMatchedAt()?->format('Y-m-d H:i:s'),
            'assigned_at' => $clientRequest->getAssignedAt()?->format('Y-m-d H:i:s'),
            'cancelled_at' => $clientRequest->getCancelledAt()?->format('Y-m-d H:i:s'),
            'created_at' => $clientRequest->getCreatedAt()->format('Y-m-d H:i:s'),
            'updated_at' => $clientRequest->getUpdatedAt()->format('Y-m-d H:i:s'),
        ];

        if ($unreadThreadCount !== null) {
            $payload['unread_thread_count'] = $unreadThreadCount;
        }

        return $payload;
    }

    private function canViewRequest(User $user, ClientRequest $clientRequest): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        if ($clientRequest->getClient()->getId() === $user->getId()) {
            return true;
        }

        return false;
    }

    #[Route('', name: 'client_request_list', methods: ['GET'])]
    public function list(Request $request, ClientRequestRepository $repository, MessageRepository $messageRepository): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $limit = $this->readListLimit($request, 10, 50);
        $page = $this->readPage($request);
        $statusView = $this->readEnumFilter($request, ['all', 'active', 'awaiting_payment', 'completed'], 'all', 'view', 'status_view');

        $baseQb = $repository->createQueryBuilder('cr');

        if ($this->isAdmin($user)) {
            // Kept for compatibility, even though admin now uses the dedicated admin route.
        } elseif ($this->isClient($user)) {
            $baseQb
                ->andWhere('cr.client = :client')
                ->setParameter('client', $user);
        } else {
            return $this->json(['error' => 'Use the vendor request feed for matched work'], 403);
        }

        $summaryBaseQb = clone $baseQb;
        $itemsQb = clone $baseQb;
        $this->applyStatusViewFilter($itemsQb, $statusView);

        $totalItems = (int) (clone $itemsQb)
            ->select('COUNT(cr.id)')
            ->getQuery()
            ->getSingleScalarResult();

        [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);

        $requests = $itemsQb
            ->orderBy('cr.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        $summary = [
            'total' => (int) (clone $summaryBaseQb)
                ->select('COUNT(cr.id)')
                ->getQuery()
                ->getSingleScalarResult(),
            'active' => (int) (clone $summaryBaseQb)
                ->select('COUNT(cr.id)')
                ->andWhere('cr.status NOT IN (:inactiveStatuses)')
                ->setParameter('inactiveStatuses', [
                    ClientRequest::STATUS_COMPLETED,
                    ClientRequest::STATUS_CANCELLED,
                ])
                ->getQuery()
                ->getSingleScalarResult(),
            'awaiting_payment' => (int) (clone $summaryBaseQb)
                ->select('COUNT(cr.id)')
                ->andWhere('cr.status = :awaitingPaymentStatus')
                ->setParameter('awaitingPaymentStatus', ClientRequest::STATUS_AWAITING_PAYMENT)
                ->getQuery()
                ->getSingleScalarResult(),
            'completed' => (int) (clone $summaryBaseQb)
                ->select('COUNT(cr.id)')
                ->andWhere('cr.status = :completedStatus')
                ->setParameter('completedStatus', ClientRequest::STATUS_COMPLETED)
                ->getQuery()
                ->getSingleScalarResult(),
        ];

        $requestIds = array_values(array_filter(array_map(
            static fn (mixed $clientRequest): ?int => $clientRequest instanceof ClientRequest ? $clientRequest->getId() : null,
            $requests
        )));
        $unreadThreadCountMap = $messageRepository->countUnreadForClientRequestIds($user, $requestIds);

        $result = [];
        foreach ($requests as $clientRequest) {
            if (!$clientRequest instanceof ClientRequest) {
                continue;
            }

            $requestId = $clientRequest->getId() ?? 0;
            $result[] = $this->serializeClientRequest(
                $clientRequest,
                $unreadThreadCountMap[$requestId] ?? 0
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

    #[Route('/{id}', name: 'client_request_show', methods: ['GET'])]
    public function show(
        ClientRequest $clientRequest,
        VendorRequestInterestRepository $interestRepository,
        MessageRepository $messageRepository
    ): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->canViewRequest($user, $clientRequest)) {
            return $this->json(['error' => 'You cannot view this request'], 403);
        }

        $payload = $this->serializeClientRequest(
            $clientRequest,
            $messageRepository->countUnreadForClientRequest($clientRequest, $user)
        );

        if ($this->isAdmin($user)) {
            $interests = $interestRepository->findBy(['clientRequest' => $clientRequest], ['submittedAt' => 'ASC']);
            $payload['interests'] = array_map(
                static fn (VendorRequestInterest $interest): array => [
                    'id' => $interest->getId(),
                    'vendor_id' => $interest->getVendor()->getId(),
                    'vendor_user_id' => $interest->getVendor()->getUser()->getId(),
                    'vendor_company_name' => $interest->getVendor()->getCompanyName(),
                    'message' => $interest->getMessage(),
                    'proposed_price_minor' => $interest->getProposedPriceMinor(),
                    'price_reason' => $interest->getPriceReason(),
                    'timeline_note' => $interest->getTimelineNote(),
                    'status' => $interest->getStatus(),
                    'submitted_at' => $interest->getSubmittedAt()->format('Y-m-d H:i:s'),
                ],
                $interests,
            );
        }

        return $this->json($payload);
    }

    #[Route('', name: 'client_request_create', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        ServiceTypeRepository $serviceTypeRepository,
        VendorServiceCapabilityRepository $capabilityRepository,
        NotificationService $notificationService
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->isClient($user)) {
            return $this->json(['error' => 'Only client accounts can create service requests'], 403);
        }

        $limiter = $this->clientRequestCreateLimiter->create(sprintf(
            '%d|%s',
            $user->getId() ?? 0,
            $request->getClientIp() ?? 'unknown'
        ));

        if (!$limiter->consume()->isAccepted()) {
            return $this->json([
                'error' => 'Too many request submissions. Please wait before opening another lane.',
            ], 429);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $serviceTypeId = isset($data['service_type_id']) ? (int) $data['service_type_id'] : 0;
        if ($serviceTypeId <= 0) {
            return $this->json(['error' => 'service_type_id is required'], 400);
        }

        $serviceType = $serviceTypeRepository->find($serviceTypeId);
        if (!$serviceType instanceof ServiceType || !$serviceType->isActive()) {
            return $this->json(['error' => 'Service type not found'], 404);
        }

        $requestSummary = isset($data['request_summary']) && is_string($data['request_summary']) ? trim($data['request_summary']) : '';
        $scopeDetails = isset($data['scope_details']) && is_string($data['scope_details']) ? trim($data['scope_details']) : null;
        $deadlineNote = isset($data['deadline_note']) && is_string($data['deadline_note']) ? trim($data['deadline_note']) : null;
        $budgetNote = isset($data['budget_note']) && is_string($data['budget_note']) ? trim($data['budget_note']) : null;
        $attachmentsCount = isset($data['attachments_count']) && is_numeric($data['attachments_count']) ? (int) $data['attachments_count'] : null;

        if (mb_strlen($requestSummary) < 12) {
            return $this->json(['error' => 'request_summary must be at least 12 characters'], 400);
        }
        if (mb_strlen($requestSummary) > 220) {
            return $this->json(['error' => 'request_summary must not exceed 220 characters'], 400);
        }
        if ($scopeDetails !== null && mb_strlen($scopeDetails) > 2000) {
            return $this->json(['error' => 'scope_details must not exceed 2000 characters'], 400);
        }
        if ($deadlineNote !== null && mb_strlen($deadlineNote) > 160) {
            return $this->json(['error' => 'deadline_note must not exceed 160 characters'], 400);
        }
        if ($budgetNote !== null && mb_strlen($budgetNote) > 160) {
            return $this->json(['error' => 'budget_note must not exceed 160 characters'], 400);
        }
        if ($attachmentsCount !== null && $attachmentsCount < 0) {
            return $this->json(['error' => 'attachments_count cannot be negative'], 400);
        }

        $clientRequest = new ClientRequest();
        $clientRequest->setClient($user);
        $clientRequest->setServiceType($serviceType);
        $clientRequest->setRequestSummary($requestSummary);
        $clientRequest->setScopeDetails($scopeDetails !== '' ? $scopeDetails : null);
        $clientRequest->setDeadlineNote($deadlineNote !== '' ? $deadlineNote : null);
        $clientRequest->setBudgetNote($budgetNote !== '' ? $budgetNote : null);
        $clientRequest->setAttachmentsCount($attachmentsCount);
        $clientRequest->markSubmitted();
        $clientRequest->setStatus(ClientRequest::STATUS_VENDOR_INTEREST_OPEN);
        $clientRequest->setMatchedAt(new \DateTimeImmutable());

        $em->persist($clientRequest);
        $em->flush();

        $capabilities = $capabilityRepository->findBy([
            'serviceType' => $serviceType,
            'isActive' => true,
            'approvedByAdmin' => true,
        ]);

        $notifiedUsers = [];
        foreach ($capabilities as $capability) {
            if (!$capability instanceof VendorServiceCapability) {
                continue;
            }

            $vendorUser = $capability->getVendor()->getUser();
            $userId = $vendorUser->getId();
            if ($userId === null || isset($notifiedUsers[$userId])) {
                continue;
            }

            $notifiedUsers[$userId] = true;

            $notificationService->notify(
                $vendorUser,
                'New matching platform request',
                sprintf('A new platform-managed request for "%s" is available for review.', $serviceType->getName()),
                Notification::CATEGORY_PLATFORM,
                false
            );
        }

        if ($notifiedUsers !== []) {
            $em->flush();
        }

        $admins = $this->findAdminUsers($em);
        if ($admins !== []) {
            $notificationService->notifyMany(
                $admins,
                'New platform request submitted',
                sprintf('A new platform-managed request for "%s" is ready for vendor coordination.', $serviceType->getName()),
                Notification::CATEGORY_PLATFORM
            );
        }

        return $this->json([
            'message' => 'Service request created',
            'request' => $this->serializeClientRequest($clientRequest),
        ], 201);
    }

    #[Route('/{id}/interest', name: 'client_request_interest_create', methods: ['POST'])]
    #[IsGranted('ROLE_VENDOR')]
    public function submitInterest(
        ClientRequest $clientRequest,
        Request $request,
        EntityManagerInterface $em,
        VendorRequestInterestRepository $interestRepository,
        VendorServiceCapabilityRepository $capabilityRepository,
        NotificationService $notificationService
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $vendorProfile = $user->getVendorProfile();
        if ($vendorProfile === null) {
            return $this->json(['error' => 'Vendor profile required'], 422);
        }

        if (!$vendorProfile->isVerificationBadgeGranted()) {
            return $this->json(['error' => 'Complete vendor verification before sending a proposal'], 403);
        }

        if (!in_array($clientRequest->getStatus(), [
            ClientRequest::STATUS_SUBMITTED,
            ClientRequest::STATUS_MATCHED,
            ClientRequest::STATUS_VENDOR_INTEREST_OPEN,
        ], true)) {
            return $this->json(['error' => 'This request is no longer open for vendor interest'], 409);
        }

        $capability = $capabilityRepository->findOneBy([
            'vendor' => $vendorProfile,
            'serviceType' => $clientRequest->getServiceType(),
            'isActive' => true,
            'approvedByAdmin' => true,
        ]);

        if (!$capability instanceof VendorServiceCapability) {
            return $this->json(['error' => 'Your vendor profile is not matched to this service type'], 403);
        }

        $existingInterest = $interestRepository->findOneBy([
            'clientRequest' => $clientRequest,
            'vendor' => $vendorProfile,
        ]);

        if ($existingInterest instanceof VendorRequestInterest) {
            return $this->json(['error' => 'You already submitted interest for this request'], 409);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $message = isset($data['message']) && is_string($data['message']) ? trim($data['message']) : null;
        $priceReason = isset($data['price_reason']) && is_string($data['price_reason']) ? trim($data['price_reason']) : null;
        $timelineNote = isset($data['timeline_note']) && is_string($data['timeline_note']) ? trim($data['timeline_note']) : null;
        $proposedPriceMinor = isset($data['proposed_price_minor']) && is_numeric($data['proposed_price_minor']) ? (int) $data['proposed_price_minor'] : null;

        if ($message !== null && mb_strlen($message) > 2000) {
            return $this->json(['error' => 'message must not exceed 2000 characters'], 400);
        }
        if ($proposedPriceMinor === null || $proposedPriceMinor <= 0) {
            return $this->json(['error' => 'proposed_price_minor must be a positive value'], 400);
        }
        if ($priceReason === null || $priceReason === '') {
            return $this->json(['error' => 'price_reason is required'], 400);
        }
        if (mb_strlen($priceReason) > 500) {
            return $this->json(['error' => 'price_reason must not exceed 500 characters'], 400);
        }
        if ($timelineNote !== null && mb_strlen($timelineNote) > 255) {
            return $this->json(['error' => 'timeline_note must not exceed 255 characters'], 400);
        }
        if ($timelineNote === null || $timelineNote === '') {
            return $this->json(['error' => 'timeline_note is required'], 400);
        }

        $interest = new VendorRequestInterest();
        $interest->setClientRequest($clientRequest);
        $interest->setVendor($vendorProfile);
        $interest->setMessage($message !== '' ? $message : null);
        $interest->setPriceReason($priceReason);
        $interest->setTimelineNote($timelineNote !== '' ? $timelineNote : null);
        $interest->setProposedPriceMinor($proposedPriceMinor);
        $interest->setStatus(VendorRequestInterest::STATUS_SUBMITTED);

        $em->persist($interest);
        $em->flush();

        $admins = $this->findAdminUsers($em);
        if ($admins !== []) {
            $notificationService->notifyMany(
                $admins,
                'Vendor proposal received',
                sprintf('A vendor submitted pricing and timeline for "%s".', $clientRequest->getServiceType()->getName()),
                Notification::CATEGORY_PLATFORM
            );
        }

        return $this->json([
            'message' => 'Interest submitted successfully',
            'interest' => [
                'id' => $interest->getId(),
                'request_id' => $clientRequest->getId(),
                'status' => $interest->getStatus(),
                'submitted_at' => $interest->getSubmittedAt()->format('Y-m-d H:i:s'),
            ],
        ], 201);
    }

    #[Route('/{id}/booking', name: 'client_request_open_booking', methods: ['POST'])]
    public function openBooking(
        ClientRequest $clientRequest,
        EntityManagerInterface $em,
        NotificationService $notificationService
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->isClient($user)) {
            return $this->json(['error' => 'Only client accounts can open platform-managed bookings'], 403);
        }

        if ($clientRequest->getClient()->getId() !== $user->getId()) {
            return $this->json(['error' => 'You cannot open a booking for this request'], 403);
        }

        /** @var Booking|null $existing */
        $existing = $em->getRepository(Booking::class)->findOneBy(['clientRequest' => $clientRequest]);
        if ($existing instanceof Booking) {
            return $this->json([
                'message' => 'Booking already exists for this request',
                'booking' => [
                    'id' => $existing->getId(),
                    'status' => $existing->getStatus(),
                    'request_summary' => $existing->getRequestSummary(),
                    'amount_minor' => $existing->resolveChargeAmountMinor(),
                    'currency' => $existing->resolveCurrency(),
                ],
            ]);
        }

        if ($clientRequest->getStatus() !== ClientRequest::STATUS_AWAITING_PAYMENT) {
            return $this->json(['error' => 'This request is not ready for booking and payment'], 409);
        }

        $selectedVendor = $clientRequest->getSelectedVendor()?->getUser();
        if ($selectedVendor === null) {
            return $this->json(['error' => 'Admin assignment is required before opening a booking'], 409);
        }

        $agreedPriceMinor = $clientRequest->getAgreedPriceMinor();
        if ($agreedPriceMinor === null || $agreedPriceMinor <= 0) {
            return $this->json(['error' => 'Agreed price is required before opening a booking'], 409);
        }

        $booking = new Booking();
        $booking->setClient($user);
        $booking->setClientRequest($clientRequest);
        $booking->setAssignedVendor($selectedVendor);
        $booking->setAgreedPriceMinor($agreedPriceMinor);
        $booking->setCurrency($clientRequest->getCurrency() ?? 'TZS');
        $booking->setServiceTitleSnapshot($clientRequest->getServiceType()->getName());
        $booking->setServiceCategorySnapshot($clientRequest->getServiceType()->getCategory());
        $booking->setServicePriceSnapshotMinor($agreedPriceMinor);
        $booking->setStatus(Booking::STATUS_PENDING);
        $booking->setRequestSummary($clientRequest->getRequestSummary());
        $booking->setScopeDetails($clientRequest->getScopeDetails());
        $booking->setDeadlineNote($clientRequest->getDeadlineNote());

        $em->persist($booking);
        $em->flush();

        $notificationService->notifyMany(
            [$user, $selectedVendor],
            'Platform booking opened',
            sprintf('A platform-managed booking #%d is ready for protected payment.', $booking->getId()),
            Notification::CATEGORY_ESCROW
        );

        return $this->json([
            'message' => 'Booking opened successfully',
            'booking' => [
                'id' => $booking->getId(),
                'status' => $booking->getStatus(),
                'request_summary' => $booking->getRequestSummary(),
                'amount_minor' => $booking->resolveChargeAmountMinor(),
                'currency' => $booking->resolveCurrency(),
            ],
        ], 201);
    }
}
