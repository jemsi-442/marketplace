<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Entity\Notification;
use App\Exception\Domain\EscrowRequiresManualReviewException;
use App\Exception\Domain\InvalidStateTransitionException;
use App\Repository\EscrowRepository;
use App\Service\EscrowService;
use App\Service\NotificationService;
use App\Service\SnippeWebhookProcessor;
use App\Support\MobileMoneyProviderCatalog;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/payments')]
class PaymentController extends AbstractController
{
    public function __construct(
        private readonly EscrowService $escrowService,
        private readonly EscrowRepository $escrowRepository,
        private readonly SnippeWebhookProcessor $webhookProcessor,
        private readonly NotificationService $notificationService,
        private readonly UrlGeneratorInterface $urlGenerator
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
        if ($msisdn === '' || $provider === '') {
            return $this->json(['error' => 'msisdn and provider are required'], 400);
        }

        $normalizedMsisdn = MobileMoneyProviderCatalog::normalizeTanzanianMsisdn($msisdn);
        if ($normalizedMsisdn === null) {
            return $this->json(['error' => 'Use a valid Tanzania mobile number such as 07XXXXXXXX or 2557XXXXXXX'], 400);
        }

        $normalizedProvider = MobileMoneyProviderCatalog::normalizeProvider($provider);
        if ($normalizedProvider === null) {
            return $this->json(['error' => 'Unsupported mobile money provider'], 400);
        }

        if ($escrow->getStatus() !== \App\Entity\Escrow::STATUS_CREATED) {
            return $this->json(['error' => 'Payment prompt can only be sent while escrow is awaiting funding'], 409);
        }

        // The webhook callback is owned by the server so clients cannot redirect gateway events elsewhere.
        $callbackUrl = $this->urlGenerator->generate('snippe_collection_webhook', [], UrlGeneratorInterface::ABSOLUTE_URL);

        // This creates the collection request only. Escrow funding is confirmed later by webhook.
        try {
            $response = $this->escrowService->initiateCollectionPayment($escrow, $normalizedMsisdn, $normalizedProvider, $callbackUrl);
        } catch (InvalidStateTransitionException) {
            return $this->json(['error' => 'Payment prompt can only be sent while escrow is awaiting funding'], 409);
        } catch (EscrowRequiresManualReviewException $exception) {
            return $this->json(['error' => $exception->getMessage()], 409);
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], 400);
        }

        $this->notificationService->notify(
            $user,
            'Payment prompt sent',
            sprintf(
                'A payment prompt has been sent for escrow %s via %s. Funding will be confirmed after the payment webhook.',
                $escrow->getReference(),
                MobileMoneyProviderCatalog::labelForCode($normalizedProvider)
            ),
            Notification::CATEGORY_FINANCE
        );

        return $this->json([
            'message' => 'Payment prompt sent',
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
