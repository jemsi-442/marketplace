<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use App\Entity\WithdrawalRequest;
use App\Service\WithdrawalService;
use App\Service\VendorWalletService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/withdrawals')]
class WithdrawalController extends AbstractController
{
    public function __construct(
        private readonly WithdrawalService $withdrawalService,
        private readonly EntityManagerInterface $em,
        private readonly VendorWalletService $vendorWalletService
    ) {
    }

    #[Route('', name: 'withdrawal_list', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function listWithdrawals(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $qb = $this->em->getRepository(WithdrawalRequest::class)
            ->createQueryBuilder('w')
            ->orderBy('w.createdAt', 'DESC');

        if (!in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            $qb->andWhere('w.vendor = :vendor')->setParameter('vendor', $user);
        }

        /** @var array<int, WithdrawalRequest> $withdrawals */
        $withdrawals = $qb->getQuery()->getResult();
        $result = [];

        foreach ($withdrawals as $withdrawal) {
            $result[] = [
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

        return $this->json($result);
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

        try {
            $withdrawal = $this->withdrawalService->request($vendor, $amountMinor, $currency, $msisdn, $provider);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 422);
        }

        return $this->json([
            'id' => $withdrawal->getId(),
            'reference' => $withdrawal->getReference(),
            'status' => $withdrawal->getStatus(),
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

        $callbackUrl = isset($payload['callback_url']) && is_string($payload['callback_url'])
            ? $payload['callback_url']
            : '/api/payments/webhooks/payout';

        $this->withdrawalService->approve($withdrawal, $admin, $callbackUrl);

        return $this->json(['message' => 'Withdrawal approved and payout initiated']);
    }
}
