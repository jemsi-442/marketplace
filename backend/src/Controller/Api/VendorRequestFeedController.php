<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Concerns\ListQueryParamsTrait;
use App\Entity\ClientRequest;
use App\Entity\User;
use App\Entity\VendorRequestInterest;
use App\Entity\VendorServiceCapability;
use App\Repository\ClientRequestRepository;
use App\Repository\MessageRepository;
use App\Repository\VendorRequestInterestRepository;
use App\Repository\VendorServiceCapabilityRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/vendor/request-feed')]
#[IsGranted('ROLE_VENDOR')]
final class VendorRequestFeedController extends AbstractController
{
    use ListQueryParamsTrait;

    /**
     * @return array<int, string>
     */
    private function getOpenStatuses(): array
    {
        return [
            ClientRequest::STATUS_SUBMITTED,
            ClientRequest::STATUS_MATCHED,
            ClientRequest::STATUS_VENDOR_INTEREST_OPEN,
        ];
    }

    private function applyProposalViewFilter(\Doctrine\ORM\QueryBuilder $qb, string $proposalView, User $vendorUser): void
    {
        if ($proposalView === 'needs_proposal') {
            $qb
                ->leftJoin(VendorRequestInterest::class, 'vri_needs', 'WITH', 'vri_needs.clientRequest = cr AND vri_needs.vendor = :proposalVendorNeeds')
                ->andWhere('vri_needs.id IS NULL')
                ->setParameter('proposalVendorNeeds', $vendorUser->getVendorProfile());

            return;
        }

        if ($proposalView === 'sent') {
            $qb
                ->innerJoin(VendorRequestInterest::class, 'vri_sent', 'WITH', 'vri_sent.clientRequest = cr AND vri_sent.vendor = :proposalVendorSent')
                ->setParameter('proposalVendorSent', $vendorUser->getVendorProfile());
        }
    }

    private function applySearchFilter(\Doctrine\ORM\QueryBuilder $qb, string $search): void
    {
        if ($search === '') {
            return;
        }

        $qb
            ->andWhere('LOWER(st.name) LIKE :search OR LOWER(COALESCE(st.category, \'\')) LIKE :search OR LOWER(cr.requestSummary) LIKE :search OR LOWER(COALESCE(cr.scopeDetails, \'\')) LIKE :search OR LOWER(COALESCE(cr.deadlineNote, \'\')) LIKE :search OR LOWER(COALESCE(cr.budgetNote, \'\')) LIKE :search')
            ->setParameter('search', '%' . mb_strtolower($search) . '%');
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeFeedRequest(
        ClientRequest $clientRequest,
        ?VendorRequestInterest $interest,
        VendorServiceCapability $capability,
        int $unreadThreadCount = 0
    ): array {
        return [
            'id' => $clientRequest->getId(),
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
            'status' => $clientRequest->getStatus(),
            'submitted_at' => $clientRequest->getSubmittedAt()?->format('Y-m-d H:i:s'),
            'matched_at' => $clientRequest->getMatchedAt()?->format('Y-m-d H:i:s'),
            'unread_thread_count' => $unreadThreadCount,
            'capability' => [
                'id' => $capability->getId(),
                'experience_level' => $capability->getExperienceLevel(),
                'starting_price_minor' => $capability->getStartingPriceMinor(),
                'capacity_status' => $capability->getCapacityStatus(),
                'turnaround_note' => $capability->getTurnaroundNote(),
            ],
            'interest' => $interest ? [
                'id' => $interest->getId(),
                'status' => $interest->getStatus(),
                'submitted_at' => $interest->getSubmittedAt()->format('Y-m-d H:i:s'),
            ] : null,
        ];
    }

    #[Route('', name: 'vendor_request_feed', methods: ['GET'])]
    public function list(
        Request $request,
        ClientRequestRepository $clientRequestRepository,
        VendorServiceCapabilityRepository $capabilityRepository,
        VendorRequestInterestRepository $interestRepository,
        MessageRepository $messageRepository
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
            return $this->json(['error' => 'Complete vendor verification before opening matched requests'], 403);
        }

        $limit = $this->readListLimit($request, 10, 50);
        $page = $this->readPage($request);
        $search = $this->readSearch($request);
        $proposalView = $this->readEnumFilter($request, ['all', 'needs_proposal', 'sent'], 'all', 'view', 'proposal_view');

        $capabilities = $capabilityRepository->findBy([
            'vendor' => $vendorProfile,
            'isActive' => true,
            'approvedByAdmin' => true,
        ]);

        if ($capabilities === []) {
            return $this->json([
                'items' => [],
                'page' => 1,
                'page_size' => $limit,
                'total_items' => 0,
                'total_pages' => 1,
                'summary' => [
                    'total' => 0,
                    'needs_proposal' => 0,
                    'sent' => 0,
                ],
            ]);
        }

        $serviceTypeIds = [];
        $capabilityMap = [];

        foreach ($capabilities as $capability) {
            if (!$capability instanceof VendorServiceCapability) {
                continue;
            }

            $serviceTypeId = $capability->getServiceType()->getId();
            if ($serviceTypeId === null) {
                continue;
            }

            $serviceTypeIds[] = $serviceTypeId;
            $capabilityMap[$serviceTypeId] = $capability;
        }

        if ($serviceTypeIds === []) {
            return $this->json([
                'items' => [],
                'page' => 1,
                'page_size' => $limit,
                'total_items' => 0,
                'total_pages' => 1,
                'summary' => [
                    'total' => 0,
                    'needs_proposal' => 0,
                    'sent' => 0,
                ],
            ]);
        }

        $baseQb = $clientRequestRepository->createQueryBuilder('cr')
            ->join('cr.serviceType', 'st')
            ->where('st.id IN (:serviceTypeIds)')
            ->andWhere('cr.status IN (:statuses)')
            ->setParameter('serviceTypeIds', array_values(array_unique($serviceTypeIds)))
            ->setParameter('statuses', $this->getOpenStatuses());

        $this->applySearchFilter($baseQb, $search);

        $summaryBaseQb = clone $baseQb;
        $itemsQb = clone $baseQb;
        $this->applyProposalViewFilter($itemsQb, $proposalView, $user);

        $totalItems = (int) (clone $itemsQb)
            ->select('COUNT(DISTINCT cr.id)')
            ->getQuery()
            ->getSingleScalarResult();

        [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);

        $requests = $itemsQb
            ->addSelect('st')
            ->orderBy('cr.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        $requestIds = [];
        foreach ($requests as $clientRequest) {
            if (!$clientRequest instanceof ClientRequest) {
                continue;
            }

            $requestId = $clientRequest->getId();
            if ($requestId === null) {
                continue;
            }

            $requestIds[] = $requestId;
        }

        $interestMap = $interestRepository->findMapForVendorByClientRequestIds($vendorProfile, $requestIds);
        $unreadThreadCountMap = $messageRepository->countUnreadForClientRequestIds($vendorProfile->getUser(), array_keys($interestMap));

        $result = [];
        foreach ($requests as $clientRequest) {
            if (!$clientRequest instanceof ClientRequest) {
                continue;
            }

            $serviceTypeId = $clientRequest->getServiceType()->getId();
            if ($serviceTypeId === null || !isset($capabilityMap[$serviceTypeId])) {
                continue;
            }

            $requestId = $clientRequest->getId();
            $interest = $requestId !== null ? ($interestMap[$requestId] ?? null) : null;
            $unreadThreadCount = $requestId !== null ? ($unreadThreadCountMap[$requestId] ?? 0) : 0;

            $result[] = $this->serializeFeedRequest(
                $clientRequest,
                $interest,
                $capabilityMap[$serviceTypeId],
                $unreadThreadCount
            );
        }

        $summary = [
            'total' => (int) (clone $summaryBaseQb)
                ->select('COUNT(DISTINCT cr.id)')
                ->getQuery()
                ->getSingleScalarResult(),
            'needs_proposal' => (int) (clone $summaryBaseQb)
                ->leftJoin(VendorRequestInterest::class, 'vri_needs_summary', 'WITH', 'vri_needs_summary.clientRequest = cr AND vri_needs_summary.vendor = :summaryVendorNeeds')
                ->andWhere('vri_needs_summary.id IS NULL')
                ->setParameter('summaryVendorNeeds', $vendorProfile)
                ->select('COUNT(DISTINCT cr.id)')
                ->getQuery()
                ->getSingleScalarResult(),
            'sent' => (int) (clone $summaryBaseQb)
                ->innerJoin(VendorRequestInterest::class, 'vri_sent_summary', 'WITH', 'vri_sent_summary.clientRequest = cr AND vri_sent_summary.vendor = :summaryVendorSent')
                ->setParameter('summaryVendorSent', $vendorProfile)
                ->select('COUNT(DISTINCT cr.id)')
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

    #[Route('/{id}', name: 'vendor_request_feed_show', methods: ['GET'])]
    public function show(
        ClientRequest $clientRequest,
        VendorServiceCapabilityRepository $capabilityRepository,
        VendorRequestInterestRepository $interestRepository,
        MessageRepository $messageRepository
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
            return $this->json(['error' => 'Complete vendor verification before opening matched requests'], 403);
        }

        $interest = $interestRepository->findOneBy([
            'clientRequest' => $clientRequest,
            'vendor' => $vendorProfile,
        ]);

        $capability = $capabilityRepository->findOneBy([
            'vendor' => $vendorProfile,
            'serviceType' => $clientRequest->getServiceType(),
            'isActive' => true,
            'approvedByAdmin' => true,
        ]);

        $statusIsOpen = in_array($clientRequest->getStatus(), $this->getOpenStatuses(), true);
        if (!$interest instanceof VendorRequestInterest && (!$capability instanceof VendorServiceCapability || !$statusIsOpen)) {
            return $this->json(['error' => 'This request is unavailable in your lane'], 404);
        }

        if (!$capability instanceof VendorServiceCapability) {
            return $this->json(['error' => 'Your capability for this service is no longer active'], 409);
        }

        $unreadThreadCount = $interest instanceof VendorRequestInterest
            ? $messageRepository->countUnreadForClientRequest($clientRequest, $vendorProfile->getUser())
            : 0;

        return $this->json($this->serializeFeedRequest($clientRequest, $interest, $capability, $unreadThreadCount));
    }
}
