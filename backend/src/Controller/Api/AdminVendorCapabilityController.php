<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Concerns\ListQueryParamsTrait;
use App\Entity\Notification;
use App\Entity\User;
use App\Entity\VendorServiceCapability;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/vendor-capabilities')]
#[IsGranted('ROLE_ADMIN')]
final class AdminVendorCapabilityController extends AbstractController
{
    use ListQueryParamsTrait;

    public function __construct(
        private readonly NotificationService $notificationService,
    ) {
    }

    private function determineReviewState(VendorServiceCapability $capability): string
    {
        if ($capability->isApprovedByAdmin()) {
            return 'approved';
        }

        if ($capability->getReviewedAt() !== null) {
            return 'returned';
        }

        return 'pending';
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeCapability(VendorServiceCapability $capability): array
    {
        $vendor = $capability->getVendor();
        $vendorUser = $vendor->getUser();

        return [
            'id' => $capability->getId(),
            'vendor' => [
                'id' => $vendor->getId(),
                'user_id' => $vendorUser->getId(),
                'email' => $vendorUser->getEmail(),
                'company_name' => $vendor->getCompanyName(),
            ],
            'service_type' => [
                'id' => $capability->getServiceType()->getId(),
                'name' => $capability->getServiceType()->getName(),
                'slug' => $capability->getServiceType()->getSlug(),
                'category' => $capability->getServiceType()->getCategory(),
                'group_slug' => $capability->getServiceType()->getGroupSlug(),
                'group_title' => $capability->getServiceType()->getGroupTitle(),
            ],
            'is_active' => $capability->isActive(),
            'experience_level' => $capability->getExperienceLevel(),
            'starting_price_minor' => $capability->getStartingPriceMinor(),
            'portfolio_summary' => $capability->getPortfolioSummary(),
            'capacity_status' => $capability->getCapacityStatus(),
            'turnaround_note' => $capability->getTurnaroundNote(),
            'approved_by_admin' => $capability->isApprovedByAdmin(),
            'review_state' => $this->determineReviewState($capability),
            'admin_review_note' => $capability->getAdminReviewNote(),
            'reviewed_at' => $capability->getReviewedAt()?->format('Y-m-d H:i:s'),
            'reviewed_by_admin' => $capability->getReviewedByAdmin() instanceof User ? [
                'id' => $capability->getReviewedByAdmin()?->getId(),
                'email' => $capability->getReviewedByAdmin()?->getEmail(),
            ] : null,
            'created_at' => $capability->getCreatedAt()->format('Y-m-d H:i:s'),
            'updated_at' => $capability->getUpdatedAt()->format('Y-m-d H:i:s'),
        ];
    }

    private function applySearchFilter(QueryBuilder $qb, string $search): void
    {
        if ($search === '') {
            return;
        }

        $normalized = '%' . mb_strtolower($search) . '%';
        $qb
            ->andWhere('LOWER(v.companyName) LIKE :search OR LOWER(u.email) LIKE :search OR LOWER(st.name) LIKE :search OR LOWER(COALESCE(st.category, \'\')) LIKE :search')
            ->setParameter('search', $normalized);
    }

    private function applyViewFilter(QueryBuilder $qb, string $view): void
    {
        if ($view === 'pending') {
            $qb
                ->andWhere('c.approvedByAdmin = false')
                ->andWhere('c.reviewedAt IS NULL');

            return;
        }

        if ($view === 'approved') {
            $qb->andWhere('c.approvedByAdmin = true');

            return;
        }

        if ($view === 'returned') {
            $qb
                ->andWhere('c.approvedByAdmin = false')
                ->andWhere('c.reviewedAt IS NOT NULL');
        }
    }

    #[Route('', name: 'admin_vendor_capability_list', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $limit = $this->readListLimit($request, 10, 50);
        $page = $this->readPage($request);
        $search = $this->readSearch($request);
        $view = $this->readEnumFilter($request, ['all', 'pending', 'approved', 'returned']);

        $baseQb = $em->getRepository(VendorServiceCapability::class)
            ->createQueryBuilder('c')
            ->join('c.vendor', 'v')
            ->join('v.user', 'u')
            ->join('c.serviceType', 'st');

        $this->applySearchFilter($baseQb, $search);

        $summaryBaseQb = clone $baseQb;
        $itemsQb = clone $baseQb;
        $this->applyViewFilter($itemsQb, $view);

        $totalItems = (int) (clone $itemsQb)
            ->select('COUNT(c.id)')
            ->getQuery()
            ->getSingleScalarResult();

        [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);

        $capabilities = $itemsQb
            ->select('c', 'v', 'u', 'st')
            ->orderBy('c.updatedAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return $this->json([
            'items' => array_map(fn (VendorServiceCapability $capability): array => $this->serializeCapability($capability), $capabilities),
            'page' => $page,
            'page_size' => $limit,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
            'summary' => [
                'total' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(c.id)')
                    ->getQuery()
                    ->getSingleScalarResult(),
                'pending' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(c.id)')
                    ->andWhere('c.approvedByAdmin = false')
                    ->andWhere('c.reviewedAt IS NULL')
                    ->getQuery()
                    ->getSingleScalarResult(),
                'approved' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(c.id)')
                    ->andWhere('c.approvedByAdmin = true')
                    ->getQuery()
                    ->getSingleScalarResult(),
                'returned' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(c.id)')
                    ->andWhere('c.approvedByAdmin = false')
                    ->andWhere('c.reviewedAt IS NOT NULL')
                    ->getQuery()
                    ->getSingleScalarResult(),
            ],
        ]);
    }

    #[Route('/summary', name: 'admin_vendor_capability_summary', methods: ['GET'])]
    public function summary(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $search = $this->readSearch($request);

        $baseQb = $em->getRepository(VendorServiceCapability::class)
            ->createQueryBuilder('c')
            ->join('c.vendor', 'v')
            ->join('v.user', 'u')
            ->join('c.serviceType', 'st');

        $this->applySearchFilter($baseQb, $search);

        return $this->json([
            'total' => (int) (clone $baseQb)
                ->select('COUNT(c.id)')
                ->getQuery()
                ->getSingleScalarResult(),
            'pending' => (int) (clone $baseQb)
                ->select('COUNT(c.id)')
                ->andWhere('c.approvedByAdmin = false')
                ->andWhere('c.reviewedAt IS NULL')
                ->getQuery()
                ->getSingleScalarResult(),
            'approved' => (int) (clone $baseQb)
                ->select('COUNT(c.id)')
                ->andWhere('c.approvedByAdmin = true')
                ->getQuery()
                ->getSingleScalarResult(),
            'returned' => (int) (clone $baseQb)
                ->select('COUNT(c.id)')
                ->andWhere('c.approvedByAdmin = false')
                ->andWhere('c.reviewedAt IS NOT NULL')
                ->getQuery()
                ->getSingleScalarResult(),
        ]);
    }

    #[Route('/{id}', name: 'admin_vendor_capability_show', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function show(VendorServiceCapability $capability): JsonResponse
    {
        return $this->json($this->serializeCapability($capability));
    }

    #[Route('/{id}/review', name: 'admin_vendor_capability_review', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function review(VendorServiceCapability $capability, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $actor = $this->getUser();
        if (!$actor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $decision = isset($data['decision']) && is_string($data['decision']) ? trim($data['decision']) : '';
        $reviewNote = isset($data['review_note']) && is_string($data['review_note']) ? trim($data['review_note']) : null;

        if (!in_array($decision, ['approve', 'return'], true)) {
            return $this->json(['error' => 'decision must be approve or return'], 400);
        }

        if ($decision === 'return' && ($reviewNote === null || $reviewNote === '')) {
            return $this->json(['error' => 'review_note is required when returning a capability'], 400);
        }

        $capability
            ->setApprovedByAdmin($decision === 'approve')
            ->setAdminReviewNote($reviewNote)
            ->setReviewedAt(new \DateTimeImmutable())
            ->setReviewedByAdmin($actor);

        $em->flush();

        $this->notificationService->notify(
            $capability->getVendor()->getUser(),
            $decision === 'approve' ? 'Capability approved' : 'Capability returned for changes',
            $decision === 'approve'
                ? sprintf('Your %s capability is now approved for WOLFIX matching.', $capability->getServiceType()->getName())
                : sprintf('Your %s capability needs changes before it can be matched again.', $capability->getServiceType()->getName()),
            Notification::CATEGORY_PLATFORM
        );

        return $this->json([
            'message' => $decision === 'approve' ? 'Capability approved successfully' : 'Capability returned for changes',
            'capability' => $this->serializeCapability($capability),
        ]);
    }
}
