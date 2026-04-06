<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Concerns\ListQueryParamsTrait;
use App\Entity\Notification;
use App\Entity\User;
use App\Entity\WithdrawalRequest;
use App\Exception\Domain\InvalidStateTransitionException;
use App\Service\NotificationService;
use App\Service\WithdrawalService;
use App\Service\VendorWalletService;
use App\Support\MobileMoneyProviderCatalog;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/withdrawals')]
class WithdrawalController extends AbstractController
{
    use ListQueryParamsTrait;

    public function __construct(
        private readonly WithdrawalService $withdrawalService,
        private readonly EntityManagerInterface $em,
        private readonly VendorWalletService $vendorWalletService,
        private readonly NotificationService $notificationService,
        private readonly UrlGeneratorInterface $urlGenerator
    ) {
    }

    private function formatDisplayMoney(int $amountMinor, string $currency): string
    {
        return sprintf('%s %s', number_format($amountMinor / 100, 0, '.', ','), strtoupper($currency));
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeWithdrawal(WithdrawalRequest $withdrawal): array
    {
        return [
            'id' => $withdrawal->getId(),
            'reference' => $withdrawal->getReference(),
            'status' => $withdrawal->getStatus(),
            'amount_minor' => $withdrawal->getAmountMinor(),
            'fee_minor' => $withdrawal->getFeeMinor(),
            'currency' => $withdrawal->getCurrency(),
            'destination_msisdn' => $withdrawal->getDestinationMsisdn(),
            'provider' => $withdrawal->getProvider(),
            'failure_reason' => $withdrawal->getFailureReason(),
            'external_transaction_id' => $withdrawal->getExternalTransactionId(),
            'created_at' => $withdrawal->getCreatedAt()->format('Y-m-d H:i:s'),
            'completed_at' => $withdrawal->getCompletedAt()?->format('Y-m-d H:i:s'),
        ];
    }

    private function applySearchFilter(\Doctrine\ORM\QueryBuilder $qb, string $search): void
    {
        if ($search === '') {
            return;
        }

        $qb
            ->andWhere('LOWER(w.reference) LIKE :search OR LOWER(w.status) LIKE :search OR LOWER(w.destinationMsisdn) LIKE :search OR LOWER(w.provider) LIKE :search OR LOWER(COALESCE(w.failureReason, \'\')) LIKE :search')
            ->setParameter('search', '%' . mb_strtolower($search) . '%');
    }

    private function applyViewFilter(\Doctrine\ORM\QueryBuilder $qb, string $view): void
    {
        if ($view === 'pending') {
            $qb
                ->andWhere('w.status IN (:pendingStatuses)')
                ->setParameter('pendingStatuses', [
                    WithdrawalRequest::STATUS_REQUESTED,
                    WithdrawalRequest::STATUS_APPROVED,
                ]);

            return;
        }

        if ($view === 'processing') {
            $qb
                ->andWhere('w.status = :processingStatus')
                ->setParameter('processingStatus', WithdrawalRequest::STATUS_PROCESSING);

            return;
        }

        if ($view === 'paid') {
            $qb
                ->andWhere('w.status = :paidStatus')
                ->setParameter('paidStatus', WithdrawalRequest::STATUS_PAID);

            return;
        }

        if ($view === 'failed') {
            $qb
                ->andWhere('w.status = :failedStatus')
                ->setParameter('failedStatus', WithdrawalRequest::STATUS_FAILED);
        }
    }

    private function isAdmin(User $user): bool
    {
        $roles = $user->getRoles();

        return in_array('ROLE_ADMIN', $roles, true) || in_array('ROLE_SUPER_ADMIN', $roles, true);
    }

    #[Route('', name: 'withdrawal_list', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function listWithdrawals(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }
        $limit = $this->readListLimit($request, 10, 50);
        $page = $this->readPage($request);
        $search = $this->readSearch($request);
        $view = $this->readEnumFilter($request, ['all', 'pending', 'processing', 'paid', 'failed']);

        $baseQb = $this->em->getRepository(WithdrawalRequest::class)
            ->createQueryBuilder('w')
            ->orderBy('w.createdAt', 'DESC');

        if (!$this->isAdmin($user)) {
            $baseQb->andWhere('w.vendor = :vendor')->setParameter('vendor', $user);
        }

        $this->applySearchFilter($baseQb, $search);

        $summaryBaseQb = clone $baseQb;
        $qb = clone $baseQb;
        $this->applyViewFilter($qb, $view);

        $totalItems = (int) (clone $qb)
            ->select('COUNT(w.id)')
            ->getQuery()
            ->getSingleScalarResult();

        [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);

        /** @var array<int, WithdrawalRequest> $withdrawals */
        $withdrawals = $qb
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
        $result = [];

        foreach ($withdrawals as $withdrawal) {
            $result[] = $this->serializeWithdrawal($withdrawal);
        }

        return $this->json([
            'items' => $result,
            'page' => $page,
            'page_size' => $limit,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
            'summary' => [
                'total' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(w.id)')
                    ->getQuery()
                    ->getSingleScalarResult(),
                'pending' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(w.id)')
                    ->andWhere('w.status IN (:pendingStatuses)')
                    ->setParameter('pendingStatuses', [
                        WithdrawalRequest::STATUS_REQUESTED,
                        WithdrawalRequest::STATUS_APPROVED,
                    ])
                    ->getQuery()
                    ->getSingleScalarResult(),
                'processing' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(w.id)')
                    ->andWhere('w.status = :processingStatus')
                    ->setParameter('processingStatus', WithdrawalRequest::STATUS_PROCESSING)
                    ->getQuery()
                    ->getSingleScalarResult(),
                'paid' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(w.id)')
                    ->andWhere('w.status = :paidStatus')
                    ->setParameter('paidStatus', WithdrawalRequest::STATUS_PAID)
                    ->getQuery()
                    ->getSingleScalarResult(),
                'failed' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(w.id)')
                    ->andWhere('w.status = :failedStatus')
                    ->setParameter('failedStatus', WithdrawalRequest::STATUS_FAILED)
                    ->getQuery()
                    ->getSingleScalarResult(),
            ],
        ]);
    }

    #[Route('/summary', name: 'withdrawal_summary', methods: ['GET'])]
    #[IsGranted('ROLE_VENDOR')]
    public function summary(Request $request): JsonResponse
    {
        $vendor = $this->getUser();
        if (!$vendor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $currencyValue = $request->query->get('currency', 'TZS');
        $currency = is_string($currencyValue) && $currencyValue !== '' ? strtoupper($currencyValue) : 'TZS';

        $balanceMinor = $this->vendorWalletService->getVendorBalance($vendor, $currency);

        $latestWithdrawal = $this->em->getRepository(WithdrawalRequest::class)
            ->findOneBy(['vendor' => $vendor], ['createdAt' => 'DESC']);

        return $this->json([
            'currency' => $currency,
            'balance_minor' => $balanceMinor,
            'latest_withdrawal' => $latestWithdrawal instanceof WithdrawalRequest ? [
                'reference' => $latestWithdrawal->getReference(),
                'status' => $latestWithdrawal->getStatus(),
                'amount_minor' => $latestWithdrawal->getAmountMinor(),
                'created_at' => $latestWithdrawal->getCreatedAt()->format('Y-m-d H:i:s'),
            ] : null,
        ]);
    }

    #[Route('', name: 'withdrawal_request', methods: ['POST'])]
    #[IsGranted('ROLE_VENDOR')]
    public function requestWithdrawal(Request $request): JsonResponse
    {
        $vendor = $this->getUser();
        if (!$vendor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $amountMinor = isset($payload['amount_minor']) && is_numeric($payload['amount_minor']) ? (int) $payload['amount_minor'] : 0;
        $currency = isset($payload['currency']) && is_string($payload['currency']) ? $payload['currency'] : 'TZS';
        $msisdn = isset($payload['msisdn']) && is_string($payload['msisdn']) ? $payload['msisdn'] : '';
        $provider = isset($payload['provider']) && is_string($payload['provider']) ? $payload['provider'] : '';

        if ($amountMinor <= 0 || $msisdn === '' || $provider === '') {
            return $this->json(['error' => 'amount_minor, msisdn, and provider are required'], 400);
        }

        $normalizedMsisdn = MobileMoneyProviderCatalog::normalizeTanzanianMsisdn($msisdn);
        if ($normalizedMsisdn === null) {
            return $this->json(['error' => 'Use a valid Tanzania mobile number such as 07XXXXXXXX or 2557XXXXXXX'], 400);
        }

        $normalizedProvider = MobileMoneyProviderCatalog::normalizeProvider($provider);
        if ($normalizedProvider === null) {
            return $this->json(['error' => 'Unsupported mobile money provider'], 400);
        }

        try {
            $withdrawal = $this->withdrawalService->request($vendor, $amountMinor, $currency, $normalizedMsisdn, $normalizedProvider);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 422);
        }

        $this->notificationService->notify(
            $vendor,
            'Withdrawal requested',
            sprintf(
                'Withdrawal %s has been submitted for %s via %s.',
                $withdrawal->getReference(),
                $this->formatDisplayMoney($withdrawal->getAmountMinor(), $withdrawal->getCurrency()),
                MobileMoneyProviderCatalog::labelForCode($normalizedProvider)
            ),
            Notification::CATEGORY_FINANCE
        );

        return $this->json([
            'message' => 'Withdrawal requested',
            'id' => $withdrawal->getId(),
            'reference' => $withdrawal->getReference(),
            'status' => $withdrawal->getStatus(),
            'withdrawal' => $this->serializeWithdrawal($withdrawal),
        ], 201);
    }

    #[Route('/{id}/approve', name: 'withdrawal_approve', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function approveWithdrawal(int $id, Request $request): JsonResponse
    {
        $admin = $this->getUser();
        if (!$admin instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $withdrawal = $this->em->getRepository(WithdrawalRequest::class)->find($id);
        if (!$withdrawal instanceof WithdrawalRequest) {
            return $this->json(['error' => 'Withdrawal not found'], 404);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }
        // The payout provider must call back to the server-owned webhook only.
        $callbackUrl = $this->urlGenerator->generate('snippe_payout_webhook', [], UrlGeneratorInterface::ABSOLUTE_URL);

        // This route can hand off to the configured payout provider, so teams should
        // run the provider preflight before using it outside the fake test gateway.
        try {
            $this->withdrawalService->approve($withdrawal, $admin, $callbackUrl);
        } catch (InvalidStateTransitionException $exception) {
            return $this->json(['error' => $exception->getMessage()], 409);
        } catch (\RuntimeException) {
            return $this->json([
                'error' => 'Withdrawal payout initiation failed. The request has been marked as failed and the balance was returned.',
            ], 422);
        }

        $this->notificationService->notify(
            $withdrawal->getVendor(),
            'Withdrawal approved',
            sprintf('Withdrawal %s has been approved and sent for payout processing.', $withdrawal->getReference()),
            Notification::CATEGORY_FINANCE
        );

        return $this->json([
            'message' => 'Withdrawal approved and payout initiated',
            'withdrawal' => $this->serializeWithdrawal($withdrawal),
        ]);
    }
}
