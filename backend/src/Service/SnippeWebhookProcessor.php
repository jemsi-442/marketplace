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
     * @param array<string, array<int, string|null>|string> $headers
     * @return array{status:int, body:array<string,mixed>}
     */
    public function processCollection(string $rawBody, array $headers): array
    {
        return $this->process('COLLECTION', $rawBody, $headers);
    }

    /**
     * @param array<string, array<int, string|null>|string> $headers
     * @return array{status:int, body:array<string,mixed>}
     */
    public function processPayout(string $rawBody, array $headers): array
    {
        return $this->process('PAYOUT', $rawBody, $headers);
    }

    /**
     * @param array<string, array<int, string|null>|string> $headers
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
        /** @var array<string, mixed> $payload */

        $eventIdRaw = $payload['id'] ?? ($payload['event_id'] ?? '');
        $eventId = is_scalar($eventIdRaw) ? (string) $eventIdRaw : '';
        if ($eventId === '') {
            $eventId = hash('sha256', $rawBody);
        }

        $eventTypeRaw = $eventHeaderType ?? ($payload['type'] ?? $kind);
        $eventType = strtoupper(is_scalar($eventTypeRaw) ? (string) $eventTypeRaw : $kind);

        $data = is_array($payload['data'] ?? null) ? $payload['data'] : [];
        $metadata = is_array($data['metadata'] ?? null) ? $data['metadata'] : [];

        $resourceReferenceRaw = $payload['reference']
            ?? ($data['reference'] ?? null)
            ?? ($metadata['order_id'] ?? null);
        $resourceReference = is_scalar($resourceReferenceRaw) ? (string) $resourceReferenceRaw : '';

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

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalize(string $kind, array $payload): array
    {
        $data = is_array($payload['data'] ?? null) ? $payload['data'] : [];
        $metadata = is_array($data['metadata'] ?? null) ? $data['metadata'] : [];

        $gatewayReferenceRaw = $data['reference'] ?? ($payload['reference'] ?? null);
        $gatewayReference = is_scalar($gatewayReferenceRaw) ? (string) $gatewayReferenceRaw : '';

        $referenceRaw = $payload['reference']
            ?? ($data['reference'] ?? null)
            ?? ($metadata['order_id'] ?? null);
        $reference = is_scalar($referenceRaw) ? (string) $referenceRaw : '';

        $statusRawValue = $payload['status'] ?? ($data['status'] ?? null);
        $statusRaw = is_scalar($statusRawValue) ? (string) $statusRawValue : '';
        $statusRaw = strtolower($statusRaw);

        $status = match ($statusRaw) {
            'completed', 'success', 'succeeded', 'paid' => 'SUCCESS',
            'failed', 'error', 'cancelled', 'canceled' => 'FAILED',
            default => strtoupper($statusRaw),
        };

        $externalTransactionIdRaw = $payload['transaction_id']
            ?? ($data['external_reference'] ?? null)
            ?? ($data['externalReference'] ?? null)
            ?? ($payload['id'] ?? null);
        $externalTransactionId = is_scalar($externalTransactionIdRaw) ? (string) $externalTransactionIdRaw : '';

        $reasonRaw = $payload['reason'] ?? ($data['reason'] ?? null);
        $reason = is_scalar($reasonRaw) ? (string) $reasonRaw : '';

        // Keep legacy fields expected by EscrowService/WithdrawalService.
        return [
            'reference' => $reference,
            'gateway_reference' => $gatewayReference,
            'status' => $status,
            'transaction_id' => $externalTransactionId,
            'reason' => $reason,
            'kind' => $kind,
            'data' => $data,
        ];
    }

    /**
     * @param array<string, array<int, string|null>|string> $headers
     */
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

            return (string) $value;
        }

        return null;
    }
}
