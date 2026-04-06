<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Concerns\ListQueryParamsTrait;
use App\Entity\Notification;
use App\Repository\EscrowRepository;
use App\Entity\User;
use App\Service\EscrowService;
use App\Service\NotificationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/escrow')]
#[IsGranted('ROLE_ADMIN')]
class EscrowController extends AbstractController
{
    use ListQueryParamsTrait;

    private const MAX_RESOLUTION_NOTE_LENGTH = 500;
    private const MAX_METADATA_ITEMS = 8;
    private const MAX_METADATA_STRING_LENGTH = 160;

    public function __construct(
        private readonly EscrowRepository $escrowRepository,
        private readonly EscrowService $escrowService,
        private readonly NotificationService $notificationService
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeEscrow(\App\Entity\Escrow $escrow): array
    {
        $snapshot = $escrow->getExternalStatusSnapshot();
        $disputeReason = is_array($snapshot) && is_string($snapshot['reason'] ?? null)
            ? trim((string) $snapshot['reason'])
            : null;
        $disputeSource = is_array($snapshot) && is_string($snapshot['source'] ?? null)
            ? trim((string) $snapshot['source'])
            : null;

        return [
            'id' => $escrow->getId(),
            'reference' => $escrow->getReference(),
            'status' => $escrow->getStatus(),
            'amount_minor' => $escrow->getAmountMinor(),
            'currency' => $escrow->getCurrency(),
            'client_label' => $this->maskUserLabel($escrow->getClient()),
            'vendor_label' => $this->maskUserLabel($escrow->getVendor()),
            'disputed_at' => $escrow->getDisputedAt()?->format('Y-m-d H:i:s'),
            'dispute_reason' => $disputeReason !== '' ? $disputeReason : null,
            'dispute_source' => $disputeSource !== '' ? $disputeSource : null,
        ];
    }

    private function applySearchFilter(\Doctrine\ORM\QueryBuilder $qb, string $search): void
    {
        if ($search === '') {
            return;
        }

        $qb
            ->andWhere('LOWER(e.reference) LIKE :search OR LOWER(client.email) LIKE :search OR LOWER(vendor.email) LIKE :search')
            ->setParameter('search', '%' . mb_strtolower($search) . '%');
    }

    #[Route('/resolve/{escrowId}', methods: ['POST'])]
    public function resolve(int $escrowId, Request $request): JsonResponse
    {
        $admin = $this->getUser();
        if (!$admin instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $escrow = $this->escrowRepository->find($escrowId);
        if ($escrow === null) {
            return $this->json(['error' => 'Escrow not found'], 404);
        }
        if ($escrow->getStatus() !== \App\Entity\Escrow::STATUS_DISPUTED) {
            return $this->json(['error' => 'Only disputed escrows can be resolved'], 409);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $releaseToVendor = ($payload['release_to_vendor'] ?? false) === true;
        $metadata = $this->normalizeResolutionMetadata($payload);

        $this->escrowService->resolveDispute(
            escrow: $escrow,
            admin: $admin,
            releaseToVendor: $releaseToVendor,
            metadata: $metadata
        );
        $this->notificationService->notifyMany(
            [$escrow->getClient(), $escrow->getVendor()],
            'Escrow dispute resolved',
            $releaseToVendor
                ? sprintf('Escrow %s was resolved in favor of the vendor.', $escrow->getReference())
                : sprintf('Escrow %s was resolved with a client refund.', $escrow->getReference()),
            Notification::CATEGORY_ESCROW
        );

        return $this->json([
            'message' => 'Escrow dispute resolved',
            'escrow' => $this->serializeEscrow($escrow),
        ]);
    }

    #[Route('/list', methods: ['GET'])]
    public function listDisputed(Request $request): JsonResponse
    {
        $limit = $this->readListLimit($request, 10, 50);
        $page = $this->readPage($request);
        $search = $this->readSearch($request);

        $baseQb = $this->escrowRepository->createQueryBuilder('e')
            ->leftJoin('e.client', 'client')
            ->leftJoin('e.vendor', 'vendor')
            ->addSelect('client', 'vendor')
            ->where('e.status = :status')
            ->setParameter('status', \App\Entity\Escrow::STATUS_DISPUTED)
            ->orderBy('e.id', 'DESC');

        $this->applySearchFilter($baseQb, $search);

        $totalItems = (int) (clone $baseQb)
            ->select('COUNT(e.id)')
            ->getQuery()
            ->getSingleScalarResult();

        [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);

        /** @var array<int, \App\Entity\Escrow> $escrows */
        $escrows = (clone $baseQb)
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        $items = array_map(fn (\App\Entity\Escrow $escrow): array => $this->serializeEscrow($escrow), $escrows);

        return $this->json([
            'items' => $items,
            'page' => $page,
            'page_size' => $limit,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
            'summary' => [
                'disputed' => $totalItems,
            ],
        ]);
    }

    #[Route('/summary', methods: ['GET'])]
    public function summary(): JsonResponse
    {
        $disputedCount = (int) $this->escrowRepository->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->where('e.status = :status')
            ->setParameter('status', \App\Entity\Escrow::STATUS_DISPUTED)
            ->getQuery()
            ->getSingleScalarResult();

        return $this->json([
            'disputed_count' => $disputedCount,
        ]);
    }

    private function maskUserLabel(User $user): string
    {
        $email = strtolower(trim($user->getEmail()));
        $localPart = strtok($email, '@');
        $localPart = is_string($localPart) ? $localPart : 'user';
        $prefix = mb_substr($localPart, 0, min(3, max(1, mb_strlen($localPart))));

        return sprintf('%s*** (#%d)', $prefix, $user->getId() ?? 0);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, scalar|array<int, string>>
     */
    private function normalizeResolutionMetadata(array $payload): array
    {
        $normalized = [
            'release_to_vendor' => ($payload['release_to_vendor'] ?? false) === true,
        ];

        $resolutionNoteRaw = $payload['resolution_note'] ?? null;
        if (is_string($resolutionNoteRaw)) {
            $resolutionNote = trim($resolutionNoteRaw);
            if ($resolutionNote !== '') {
                $normalized['resolution_note'] = mb_substr($resolutionNote, 0, self::MAX_RESOLUTION_NOTE_LENGTH);
            }
        }

        $tagsRaw = $payload['tags'] ?? null;
        if (is_array($tagsRaw)) {
            $tags = [];
            foreach ($tagsRaw as $tag) {
                if (!is_string($tag)) {
                    continue;
                }

                $normalizedTag = trim($tag);
                if ($normalizedTag === '') {
                    continue;
                }

                $tags[] = mb_substr($normalizedTag, 0, 40);
                if (count($tags) >= self::MAX_METADATA_ITEMS) {
                    break;
                }
            }

            if ($tags !== []) {
                $normalized['tags'] = array_values(array_unique($tags));
            }
        }

        $evidenceSummaryRaw = $payload['evidence_summary'] ?? null;
        if (is_string($evidenceSummaryRaw)) {
            $evidenceSummary = trim($evidenceSummaryRaw);
            if ($evidenceSummary !== '') {
                $normalized['evidence_summary'] = mb_substr($evidenceSummary, 0, self::MAX_METADATA_STRING_LENGTH);
            }
        }

        return $normalized;
    }
}
