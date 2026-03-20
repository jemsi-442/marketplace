<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Repository\EscrowRepository;
use App\Service\EscrowService;
use App\Service\SnippeWebhookProcessor;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/payments')]
class PaymentController extends AbstractController
{
    public function __construct(
        private readonly EscrowService $escrowService,
        private readonly EscrowRepository $escrowRepository,
        private readonly SnippeWebhookProcessor $webhookProcessor
    ) {
    }

    #[Route('/escrows/{escrowId}/collect', name: 'payment_create_collection', methods: ['POST'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
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

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $msisdn = isset($payload['msisdn']) && is_string($payload['msisdn']) ? $payload['msisdn'] : '';
        $provider = isset($payload['provider']) && is_string($payload['provider']) ? $payload['provider'] : '';
        $callbackUrl = isset($payload['callback_url']) && is_string($payload['callback_url'])
            ? $payload['callback_url']
            : '/api/payments/webhooks/collection';

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
        $result = $this->webhookProcessor->processCollection($request->getContent(), $request->headers->all());
        return $this->json($result['body'], $result['status']);
    }

    #[Route('/webhooks/payout', name: 'snippe_payout_webhook', methods: ['POST'])]
    public function payoutWebhook(Request $request): JsonResponse
    {
        $result = $this->webhookProcessor->processPayout($request->getContent(), $request->headers->all());
        return $this->json($result['body'], $result['status']);
    }
}
