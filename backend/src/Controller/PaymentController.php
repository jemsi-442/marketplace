<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Repository\EscrowRepository;
use App\Service\EscrowService;
use App\Service\SnippeClient;
use App\Service\SnippeWebhookService;
use App\Service\WithdrawalService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/payments')]
class PaymentController extends AbstractController
{
    public function __construct(
        private readonly EscrowService $escrowService,
        private readonly WithdrawalService $withdrawalService,
        private readonly SnippeClient $snippeClient,
        private readonly SnippeWebhookService $webhookService,
        private readonly EscrowRepository $escrowRepository
    ) {
    }

    #[Route('/escrows/{escrowId}/collect', name: 'payment_create_collection', methods: ['POST'])]
    public function createCollection(int $escrowId, Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $escrow = $this->escrowRepository->find($escrowId);
        if ($escrow === null) {
            return $this->json(['error' => 'Escrow not found'], 404);
        }

        if ($escrow->getClient()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Only escrow client can initiate collection'], 403);
        }

        $payload = json_decode($request->getContent(), true) ?? [];
        $msisdn = (string) ($payload['msisdn'] ?? '');
        $provider = (string) ($payload['provider'] ?? '');
        $callbackUrl = (string) ($payload['callback_url'] ?? '/api/payments/webhooks/collection');

        if ($msisdn === '' || $provider === '') {
            return $this->json(['error' => 'msisdn and provider are required'], 400);
        }

        $response = $this->escrowService->initiateCollectionPayment($escrow, $msisdn, $provider, $callbackUrl);

        return $this->json([
            'message' => 'Collection session created',
            'escrow_reference' => $escrow->getReference(),
            'gateway' => $response,
        ], 201);
    }

    #[Route('/webhooks/collection', name: 'snippe_collection_webhook', methods: ['POST'])]
    public function collectionWebhook(Request $request): JsonResponse
    {
        $rawBody = $request->getContent();
        $signature = $request->headers->get('X-Snippe-Signature');

        if (!$this->snippeClient->verifyWebhookSignature($rawBody, $signature)) {
            return $this->json(['error' => 'Invalid or missing webhook signature'], 401);
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $reference = (string) ($payload['reference'] ?? '');
        if ($reference === '') {
            return $this->json(['error' => 'Missing webhook reference'], 400);
        }

        $isNewEvent = $this->webhookService->recordIncoming($reference, 'COLLECTION', $payload, $signature);
        if (!$isNewEvent) {
            return $this->json(['message' => 'Duplicate webhook ignored'], 202);
        }

        try {
            $this->escrowService->handleCollectionWebhook($payload);
        } catch (\RuntimeException $e) {
            return $this->json([
                'message' => 'Webhook recorded but not applied',
                'reason' => $e->getMessage(),
            ], 202);
        }

        return $this->json(['message' => 'Webhook processed'], 202);
    }

    #[Route('/webhooks/payout', name: 'snippe_payout_webhook', methods: ['POST'])]
    public function payoutWebhook(Request $request): JsonResponse
    {
        $rawBody = $request->getContent();
        $signature = $request->headers->get('X-Snippe-Signature');

        if (!$this->snippeClient->verifyWebhookSignature($rawBody, $signature)) {
            return $this->json(['error' => 'Invalid or missing webhook signature'], 401);
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $reference = (string) ($payload['reference'] ?? '');
        if ($reference === '') {
            return $this->json(['error' => 'Missing webhook reference'], 400);
        }

        $isNewEvent = $this->webhookService->recordIncoming($reference, 'PAYOUT', $payload, $signature);
        if (!$isNewEvent) {
            return $this->json(['message' => 'Duplicate webhook ignored'], 202);
        }

        try {
            $this->withdrawalService->handlePayoutWebhook($payload);
        } catch (\RuntimeException $e) {
            return $this->json([
                'message' => 'Webhook recorded but not applied',
                'reason' => $e->getMessage(),
            ], 202);
        }

        return $this->json(['message' => 'Webhook processed'], 202);
    }
}
