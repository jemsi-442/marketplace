<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use App\Entity\WithdrawalRequest;
use App\Service\WithdrawalService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/withdrawals')]
class WithdrawalController extends AbstractController
{
    public function __construct(
        private readonly WithdrawalService $withdrawalService,
        private readonly EntityManagerInterface $em
    ) {
    }

    #[Route('', name: 'withdrawal_request', methods: ['POST'])]
    public function requestWithdrawal(Request $request): JsonResponse
    {
        $vendor = $this->getUser();
        if (!$vendor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $payload = json_decode($request->getContent(), true) ?? [];
        $amountMinor = (int) ($payload['amount_minor'] ?? 0);
        $currency = (string) ($payload['currency'] ?? 'TZS');
        $msisdn = (string) ($payload['msisdn'] ?? '');
        $provider = (string) ($payload['provider'] ?? '');

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
    public function approveWithdrawal(int $id, Request $request): JsonResponse
    {
        $admin = $this->getUser();
        if (!$admin instanceof User || !in_array('ROLE_ADMIN', $admin->getRoles(), true)) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $withdrawal = $this->em->getRepository(WithdrawalRequest::class)->find($id);
        if (!$withdrawal instanceof WithdrawalRequest) {
            return $this->json(['error' => 'Withdrawal not found'], 404);
        }

        $payload = json_decode($request->getContent(), true) ?? [];
        $callbackUrl = (string) ($payload['callback_url'] ?? '/api/payments/webhooks/payout');

        $this->withdrawalService->approve($withdrawal, $admin, $callbackUrl);

        return $this->json(['message' => 'Withdrawal approved and payout initiated']);
    }
}
