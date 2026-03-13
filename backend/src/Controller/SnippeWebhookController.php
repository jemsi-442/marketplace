<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\SnippeWebhookProcessor;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/webhooks/snippe')]
class SnippeWebhookController extends AbstractController
{
    public function __construct(
        private readonly SnippeWebhookProcessor $webhookProcessor
    ) {
    }

    #[Route('/collection', name: 'snippe_collection_webhook_public', methods: ['POST'])]
    public function collection(Request $request): JsonResponse
    {
        $result = $this->webhookProcessor->processCollection($request->getContent(), $request->headers->all());
        return $this->json($result['body'], $result['status']);
    }

    #[Route('/payout', name: 'snippe_payout_webhook_public', methods: ['POST'])]
    public function payout(Request $request): JsonResponse
    {
        $result = $this->webhookProcessor->processPayout($request->getContent(), $request->headers->all());
        return $this->json($result['body'], $result['status']);
    }
}
