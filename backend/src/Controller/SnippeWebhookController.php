<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\EscrowService;
use App\Service\SnippeClient;
use App\Service\SnippeWebhookService;
use App\Service\WithdrawalService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/webhooks/snippe')]
class SnippeWebhookController extends AbstractController
{
    public function __construct(
        private readonly SnippeClient $snippeClient,
        private readonly SnippeWebhookService $webhookService,
        private readonly EscrowService $escrowService,
        private readonly WithdrawalService $withdrawalService
    ) {
    }

    #[Route('/collection', name: 'snippe_collection_webhook_public', methods: ['POST'])]
    public function collection(Request $request): JsonResponse
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

        $isNew = $this->webhookService->recordIncoming($reference, 'COLLECTION', $payload, $signature);
        if (!$isNew) {
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

    #[Route('/payout', name: 'snippe_payout_webhook_public', methods: ['POST'])]
    public function payout(Request $request): JsonResponse
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

        $isNew = $this->webhookService->recordIncoming($reference, 'PAYOUT', $payload, $signature);
        if (!$isNew) {
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
