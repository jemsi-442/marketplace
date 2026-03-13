<?php

declare(strict_types=1);

namespace App\Service;

final class SnippeWebhookProcessor
{
    public function __construct(
        private readonly SnippeWebhookValidator $validator,
        private readonly SnippeWebhookService $webhookStore,
        private readonly EscrowService $escrowService,
        private readonly WithdrawalService $withdrawalService
    ) {
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function processCollection(string $rawBody, array $headers): array
    {
        return $this->process('COLLECTION', $rawBody, $headers);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function processPayout(string $rawBody, array $headers): array
    {
        return $this->process('PAYOUT', $rawBody, $headers);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function process(string $kind, string $rawBody, array $headers): array
    {
        $signature = $this->header($headers, 'x-webhook-signature')
            ?? $this->header($headers, 'x-snippe-signature');
        $timestamp = $this->header($headers, 'x-webhook-timestamp');
        $eventHeaderType = $this->header($headers, 'x-webhook-event');

        try {
            $this->validator->assertValid($rawBody, $signature, $timestamp);
        } catch (\InvalidArgumentException $e) {
            return ['status' => 401, 'body' => ['error' => $e->getMessage()]];
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            return ['status' => 400, 'body' => ['error' => 'Invalid JSON payload']];
        }

        $eventId = (string) ($payload['id'] ?? $payload['event_id'] ?? '');
        if ($eventId === '') {
            $eventId = hash('sha256', $rawBody);
        }

        $eventType = strtoupper((string) ($eventHeaderType ?? ($payload['type'] ?? $kind)));

        $resourceReference = (string) (
            $payload['reference']
            ?? ($payload['data']['reference'] ?? '')
            ?? ($payload['data']['metadata']['order_id'] ?? '')
        );

        if ($resourceReference === '') {
            return ['status' => 400, 'body' => ['error' => 'Missing webhook reference']];
        }

        $sentAt = null;
        if ($timestamp !== null && ctype_digit($timestamp)) {
            $sentAt = (new \DateTimeImmutable())->setTimestamp((int) $timestamp);
        }

        $isNew = $this->webhookStore->recordIncoming(
            eventId: $eventId,
            externalReference: $resourceReference,
            eventType: $eventType,
            payload: $payload,
            signature: $signature,
            sentAt: $sentAt
        );

        if (!$isNew) {
            return ['status' => 202, 'body' => ['message' => 'Duplicate webhook ignored']];
        }

        $normalized = $this->normalize($kind, $payload);

        try {
            if ($kind === 'COLLECTION') {
                $this->escrowService->handleCollectionWebhook($normalized);
            } else {
                $this->withdrawalService->handlePayoutWebhook($normalized);
            }
        } catch (\RuntimeException $e) {
            return [
                'status' => 202,
                'body' => [
                    'message' => 'Webhook recorded but not applied',
                    'reason' => $e->getMessage(),
                ],
            ];
        }

        $this->webhookStore->markProcessed($eventId);

        return ['status' => 202, 'body' => ['message' => 'Webhook processed']];
    }

    private function normalize(string $kind, array $payload): array
    {
        $data = is_array($payload['data'] ?? null) ? $payload['data'] : [];

        $gatewayReference = (string) ($data['reference'] ?? ($payload['reference'] ?? ''));

        $reference = (string) (
            $payload['reference']
            ?? ($data['reference'] ?? '')
            ?? ($data['metadata']['order_id'] ?? '')
        );

        $statusRaw = (string) (
            $payload['status']
            ?? ($data['status'] ?? '')
        );
        $statusRaw = strtolower($statusRaw);

        $status = match ($statusRaw) {
            'completed', 'success', 'succeeded', 'paid' => 'SUCCESS',
            'failed', 'error', 'cancelled', 'canceled' => 'FAILED',
            default => strtoupper($statusRaw),
        };

        $externalTransactionId = (string) (
            $payload['transaction_id']
            ?? ($data['external_reference'] ?? '')
            ?? ($data['externalReference'] ?? '')
            ?? ($payload['id'] ?? '')
        );

        // Keep legacy fields expected by EscrowService/WithdrawalService.
        return [
            'reference' => $reference,
            'gateway_reference' => $gatewayReference,
            'status' => $status,
            'transaction_id' => $externalTransactionId,
            'kind' => $kind,
            'data' => $data,
        ];
    }

    private function header(array $headers, string $name): ?string
    {
        $name = strtolower($name);
        foreach ($headers as $key => $value) {
            if (strtolower((string) $key) !== $name) {
                continue;
            }

            if (is_array($value)) {
                $first = $value[0] ?? null;
                return $first !== null ? (string) $first : null;
            }

            return $value !== null ? (string) $value : null;
        }

        return null;
    }
}
