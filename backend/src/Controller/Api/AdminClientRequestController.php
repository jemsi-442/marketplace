<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Concerns\ListQueryParamsTrait;
use App\Entity\ClientRequest;
use App\Entity\Notification;
use App\Entity\User;
use App\Entity\VendorRequestInterest;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/client-requests')]
#[IsGranted('ROLE_ADMIN')]
final class AdminClientRequestController extends AbstractController
{
    use ListQueryParamsTrait;

    public function __construct(
        private readonly NotificationService $notificationService
    ) {
    }

    private function applyStatusViewFilter(\Doctrine\ORM\QueryBuilder $qb, string $statusView): void
    {
        if ($statusView === 'needs_review') {
            $qb
                ->andWhere('cr.status IN (:needsReviewStatuses)')
                ->setParameter('needsReviewStatuses', [
                    ClientRequest::STATUS_SUBMITTED,
                    ClientRequest::STATUS_MATCHED,
                    ClientRequest::STATUS_VENDOR_INTEREST_OPEN,
                ]);

            return;
        }

        if ($statusView === 'awaiting_payment') {
            $qb
                ->andWhere('cr.status = :awaitingPaymentStatus')
                ->setParameter('awaitingPaymentStatus', ClientRequest::STATUS_AWAITING_PAYMENT);
        }
    }

    private function applySearchFilter(\Doctrine\ORM\QueryBuilder $qb, string $search): void
    {
        if ($search === '') {
            return;
        }

        $qb
            ->andWhere('LOWER(u.email) LIKE :search OR LOWER(st.name) LIKE :search OR LOWER(COALESCE(st.category, \'\')) LIKE :search OR LOWER(cr.requestSummary) LIKE :search OR LOWER(cr.status) LIKE :search')
            ->setParameter('search', '%' . mb_strtolower($search) . '%');
    }

    private function formatMoneyMinor(int $amountMinor, string $currency): string
    {
        return sprintf('%s %s', number_format($amountMinor / 100, 0, '.', ','), strtoupper($currency));
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeRequest(ClientRequest $clientRequest): array
    {
        return [
            'id' => $clientRequest->getId(),
            'client' => [
                'id' => $clientRequest->getClient()->getId(),
                'email' => $clientRequest->getClient()->getEmail(),
            ],
            'service_type' => [
                'id' => $clientRequest->getServiceType()->getId(),
                'name' => $clientRequest->getServiceType()->getName(),
                'slug' => $clientRequest->getServiceType()->getSlug(),
                'category' => $clientRequest->getServiceType()->getCategory(),
            ],
            'request_summary' => $clientRequest->getRequestSummary(),
            'scope_details' => $clientRequest->getScopeDetails(),
            'deadline_note' => $clientRequest->getDeadlineNote(),
            'budget_note' => $clientRequest->getBudgetNote(),
            'attachments_count' => $clientRequest->getAttachmentsCount(),
            'selected_vendor' => $clientRequest->getSelectedVendor() ? [
                'id' => $clientRequest->getSelectedVendor()?->getId(),
                'company_name' => $clientRequest->getSelectedVendor()?->getCompanyName(),
                'user_id' => $clientRequest->getSelectedVendor()?->getUser()->getId(),
            ] : null,
            'assigned_by_admin_id' => $clientRequest->getAssignedByAdmin()?->getId(),
            'agreed_price_minor' => $clientRequest->getAgreedPriceMinor(),
            'currency' => $clientRequest->getCurrency(),
            'agreed_timeline_note' => $clientRequest->getAgreedTimelineNote(),
            'admin_assignment_note' => $clientRequest->getAdminAssignmentNote(),
            'status' => $clientRequest->getStatus(),
            'submitted_at' => $clientRequest->getSubmittedAt()?->format('Y-m-d H:i:s'),
            'matched_at' => $clientRequest->getMatchedAt()?->format('Y-m-d H:i:s'),
            'assigned_at' => $clientRequest->getAssignedAt()?->format('Y-m-d H:i:s'),
            'created_at' => $clientRequest->getCreatedAt()->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeInterest(VendorRequestInterest $interest): array
    {
        return [
            'id' => $interest->getId(),
            'vendor' => [
                'id' => $interest->getVendor()->getId(),
                'company_name' => $interest->getVendor()->getCompanyName(),
                'user_id' => $interest->getVendor()->getUser()->getId(),
                'email' => $interest->getVendor()->getUser()->getEmail(),
            ],
            'message' => $interest->getMessage(),
            'proposed_price_minor' => $interest->getProposedPriceMinor(),
            'price_reason' => $interest->getPriceReason(),
            'timeline_note' => $interest->getTimelineNote(),
            'status' => $interest->getStatus(),
            'submitted_at' => $interest->getSubmittedAt()->format('Y-m-d H:i:s'),
            'reviewed_at' => $interest->getReviewedAt()?->format('Y-m-d H:i:s'),
        ];
    }

    #[Route('', name: 'admin_client_request_list', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $limit = $this->readListLimit($request, 10, 50);
        $page = $this->readPage($request);
        $search = $this->readSearch($request);
        $statusView = $this->readEnumFilter($request, ['all', 'needs_review', 'awaiting_payment'], 'all', 'view', 'status_view');

        $baseQb = $em->getRepository(ClientRequest::class)
            ->createQueryBuilder('cr')
            ->join('cr.client', 'u')
            ->join('cr.serviceType', 'st');

        $this->applySearchFilter($baseQb, $search);

        $summaryBaseQb = clone $baseQb;
        $itemsQb = clone $baseQb;
        $this->applyStatusViewFilter($itemsQb, $statusView);

        $totalItems = (int) (clone $itemsQb)
            ->select('COUNT(DISTINCT cr.id)')
            ->getQuery()
            ->getSingleScalarResult();

        [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);

        $requests = $itemsQb
            ->select('cr', 'u', 'st')
            ->orderBy('cr.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        $result = [];
        foreach ($requests as $clientRequest) {
            if (!$clientRequest instanceof ClientRequest) {
                continue;
            }

            $result[] = $this->serializeRequest($clientRequest);
        }

        $summary = [
            'total' => (int) (clone $summaryBaseQb)
                ->select('COUNT(DISTINCT cr.id)')
                ->getQuery()
                ->getSingleScalarResult(),
            'open' => (int) (clone $summaryBaseQb)
                ->select('COUNT(DISTINCT cr.id)')
                ->andWhere('cr.status NOT IN (:closedStatuses)')
                ->setParameter('closedStatuses', [
                    ClientRequest::STATUS_COMPLETED,
                    ClientRequest::STATUS_CANCELLED,
                ])
                ->getQuery()
                ->getSingleScalarResult(),
            'needs_review' => (int) (clone $summaryBaseQb)
                ->select('COUNT(DISTINCT cr.id)')
                ->andWhere('cr.status IN (:needsReviewStatuses)')
                ->setParameter('needsReviewStatuses', [
                    ClientRequest::STATUS_SUBMITTED,
                    ClientRequest::STATUS_MATCHED,
                    ClientRequest::STATUS_VENDOR_INTEREST_OPEN,
                ])
                ->getQuery()
                ->getSingleScalarResult(),
            'awaiting_payment' => (int) (clone $summaryBaseQb)
                ->select('COUNT(DISTINCT cr.id)')
                ->andWhere('cr.status = :awaitingPaymentStatus')
                ->setParameter('awaitingPaymentStatus', ClientRequest::STATUS_AWAITING_PAYMENT)
                ->getQuery()
                ->getSingleScalarResult(),
        ];

        return $this->json([
            'items' => $result,
            'page' => $page,
            'page_size' => $limit,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
            'summary' => $summary,
        ]);
    }

    #[Route('/{id}/interests', name: 'admin_client_request_interests', methods: ['GET'])]
    public function interests(ClientRequest $clientRequest, EntityManagerInterface $em): JsonResponse
    {
        $interests = $em->getRepository(VendorRequestInterest::class)->findBy(
            ['clientRequest' => $clientRequest],
            ['submittedAt' => 'ASC']
        );

        $result = [];
        foreach ($interests as $interest) {
            if (!$interest instanceof VendorRequestInterest) {
                continue;
            }

            $result[] = $this->serializeInterest($interest);
        }

        return $this->json([
            'request' => $this->serializeRequest($clientRequest),
            'interests' => $result,
        ]);
    }

    #[Route('/{id}/assign', name: 'admin_client_request_assign', methods: ['POST'])]
    public function assign(
        ClientRequest $clientRequest,
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $actor = $this->getUser();
        if (!$actor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $interestId = isset($data['vendor_interest_id']) ? (int) $data['vendor_interest_id'] : 0;
        if ($interestId <= 0) {
            return $this->json(['error' => 'vendor_interest_id is required'], 400);
        }

        /** @var VendorRequestInterest|null $selectedInterest */
        $selectedInterest = $em->getRepository(VendorRequestInterest::class)->find($interestId);
        if (!$selectedInterest instanceof VendorRequestInterest || $selectedInterest->getClientRequest()->getId() !== $clientRequest->getId()) {
            return $this->json(['error' => 'Vendor interest not found for this request'], 404);
        }

        if (!in_array($clientRequest->getStatus(), [
            ClientRequest::STATUS_SUBMITTED,
            ClientRequest::STATUS_MATCHED,
            ClientRequest::STATUS_VENDOR_INTEREST_OPEN,
            ClientRequest::STATUS_VENDOR_SELECTED,
        ], true)) {
            return $this->json(['error' => 'This request is not open for assignment'], 409);
        }

        $agreedPriceMinor = isset($data['agreed_price_minor']) && is_numeric($data['agreed_price_minor'])
            ? (int) $data['agreed_price_minor']
            : $selectedInterest->getProposedPriceMinor();
        $currency = isset($data['currency']) && is_string($data['currency']) && trim($data['currency']) !== ''
            ? strtoupper(trim($data['currency']))
            : 'TZS';
        $agreedTimelineNote = isset($data['agreed_timeline_note']) && is_string($data['agreed_timeline_note']) && trim($data['agreed_timeline_note']) !== ''
            ? trim($data['agreed_timeline_note'])
            : $selectedInterest->getTimelineNote();
        $adminAssignmentNote = isset($data['admin_assignment_note']) && is_string($data['admin_assignment_note']) ? trim($data['admin_assignment_note']) : null;

        if ($agreedPriceMinor !== null && $agreedPriceMinor < 0) {
            return $this->json(['error' => 'agreed_price_minor cannot be negative'], 400);
        }
        if ($agreedPriceMinor === null || $agreedPriceMinor <= 0) {
            return $this->json(['error' => 'agreed_price_minor must be a positive value'], 400);
        }
        if ($agreedTimelineNote === null || $agreedTimelineNote === '') {
            return $this->json(['error' => 'agreed_timeline_note is required'], 400);
        }
        if (mb_strlen($agreedTimelineNote) > 255) {
            return $this->json(['error' => 'agreed_timeline_note must not exceed 255 characters'], 400);
        }
        if ($adminAssignmentNote !== null && mb_strlen($adminAssignmentNote) > 500) {
            return $this->json(['error' => 'admin_assignment_note must not exceed 500 characters'], 400);
        }

        $allInterests = $em->getRepository(VendorRequestInterest::class)->findBy(['clientRequest' => $clientRequest]);

        foreach ($allInterests as $interest) {
            if (!$interest instanceof VendorRequestInterest) {
                continue;
            }

            if ($interest->getId() === $selectedInterest->getId()) {
                $interest->setStatus(VendorRequestInterest::STATUS_APPROVED);
            } elseif ($interest->getStatus() !== VendorRequestInterest::STATUS_WITHDRAWN) {
                $interest->setStatus(VendorRequestInterest::STATUS_REJECTED);
            }

            $interest->setReviewedAt(new \DateTimeImmutable());
        }

        $clientRequest->setSelectedVendor($selectedInterest->getVendor());
        $clientRequest->setAssignedByAdmin($actor);
        $clientRequest->setAgreedPriceMinor($agreedPriceMinor);
        $clientRequest->setCurrency($currency);
        $clientRequest->setAgreedTimelineNote($agreedTimelineNote);
        $clientRequest->setAdminAssignmentNote($adminAssignmentNote !== '' ? $adminAssignmentNote : null);
        $clientRequest->setAssignedAt(new \DateTimeImmutable());
        $clientRequest->setStatus(ClientRequest::STATUS_AWAITING_PAYMENT);

        $em->flush();

        $this->notificationService->notify(
            $selectedInterest->getVendor()->getUser(),
            'You were selected for a platform request',
            sprintf('You were selected to handle the platform-managed request for "%s".', $clientRequest->getServiceType()->getName()),
            Notification::CATEGORY_PLATFORM,
            false
        );

        $this->notificationService->notify(
            $clientRequest->getClient(),
            'Your request is ready for payment',
            sprintf(
                'WOLFIX reviewed your request for "%s". Agreed price: %s. Estimated timeline: %s.',
                $clientRequest->getServiceType()->getName(),
                $this->formatMoneyMinor($agreedPriceMinor, $currency),
                $agreedTimelineNote
            ),
            Notification::CATEGORY_PLATFORM,
            false
        );

        foreach ($allInterests as $interest) {
            if (!$interest instanceof VendorRequestInterest || $interest->getId() === $selectedInterest->getId()) {
                continue;
            }

            if ($interest->getStatus() !== VendorRequestInterest::STATUS_REJECTED) {
                continue;
            }

            $this->notificationService->notify(
                $interest->getVendor()->getUser(),
                'This platform request was assigned to another vendor',
                sprintf('The platform-managed request for "%s" has been assigned to another vendor.', $clientRequest->getServiceType()->getName()),
                Notification::CATEGORY_PLATFORM,
                false
            );
        }

        $em->flush();

        return $this->json([
            'message' => 'Vendor assigned successfully',
            'request' => $this->serializeRequest($clientRequest),
            'approved_interest' => $this->serializeInterest($selectedInterest),
        ]);
    }
}
