<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\SnippeApiLog;
use Doctrine\ORM\EntityManagerInterface;

class SnippeClient
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly string $apiKey,
        private readonly string $baseUrl,
        private readonly ?string $webhookSecret = null
    ) {
    }

    public function createCollection(
        string $reference,
        int $amountMinor,
        string $currency,
        string $msisdn,
        string $provider,
        string $callbackUrl,
        string $idempotencyKey,
        ?string $customerEmail = null,
        ?string $customerFirstName = null,
        ?string $customerLastName = null,
        array $metadata = []
    ): array {
        $payload = [
            'payment_type' => 'mobile',
            'details' => [
                'amount' => $amountMinor,
                'currency' => strtoupper($currency),
            ],
            'phone_number' => $msisdn,
            'customer' => [
                'firstname' => $customerFirstName ?: 'Client',
                'lastname' => $customerLastName ?: 'User',
                'email' => $customerEmail ?: 'unknown@example.com',
            ],
            'webhook_url' => $callbackUrl,
            'metadata' => array_merge([
                'order_id' => $reference,
                'provider_hint' => strtoupper($provider),
            ], $metadata),
        ];

        return $this->request('POST', '/v1/payments', $payload, $idempotencyKey, 'PAYMENT_CREATE', $reference);
    }

    public function createPayout(
        string $reference,
        int $amountMinor,
        string $currency,
        string $msisdn,
        string $provider,
        string $callbackUrl,
        string $idempotencyKey,
        ?string $recipientName = null,
        array $metadata = []
    ): array {
        $payload = [
            'amount' => $amountMinor,
            'channel' => 'mobile',
            'recipient_phone' => $msisdn,
            'recipient_name' => $recipientName ?: 'Vendor',
            'narration' => sprintf('Marketplace withdrawal %s', $reference),
            'webhook_url' => $callbackUrl,
            'metadata' => array_merge([
                'order_id' => $reference,
                'provider_hint' => strtoupper($provider),
            ], $metadata),
        ];

        return $this->request('POST', '/v1/payouts/send', $payload, $idempotencyKey, 'PAYOUT_SEND', $reference);
    }

    public function verifyWebhookSignature(string $rawBody, ?string $signature): bool
    {
        if ($signature === null || trim($signature) === '') {
            return false;
        }

        if ($this->webhookSecret === null || trim($this->webhookSecret) === '') {
            return false;
        }

        $computed = hash_hmac('sha256', $rawBody, $this->webhookSecret);

        return hash_equals($computed, trim($signature));
    }

    private function request(
        string $method,
        string $endpoint,
        array $payload,
        string $idempotencyKey,
        string $operation,
        string $reference
    ): array {
        $endpoint = '/' . ltrim($endpoint, '/');
        $base = rtrim($this->baseUrl, '/');
        if (str_ends_with($base, '/v1') && str_starts_with($endpoint, '/v1/')) {
            $endpoint = substr($endpoint, 3);
        }
        $url = $base . $endpoint;
        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Bearer ' . $this->apiKey,
                'Idempotency-Key: ' . $idempotencyKey,
                'X-Idempotency-Key: ' . $idempotencyKey,
            ],
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_TIMEOUT => 30,
        ]);

        $rawResponse = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        $responsePayload = null;
        if (is_string($rawResponse) && $rawResponse !== '') {
            try {
                $decoded = json_decode($rawResponse, true, 512, JSON_THROW_ON_ERROR);
                $responsePayload = is_array($decoded) ? $decoded : ['raw' => $rawResponse];
            } catch (\JsonException) {
                $responsePayload = ['raw' => $rawResponse];
            }
        }

        $this->em->persist(new SnippeApiLog(
            direction: 'OUTBOUND',
            operation: $operation,
            reference: $reference,
            endpoint: $endpoint,
            payload: $payload,
            httpStatus: $httpCode > 0 ? $httpCode : null,
            responsePayload: $responsePayload
        ));
        $this->em->flush();

        if ($error !== '') {
            throw new \RuntimeException('Snippe request failed: ' . $error);
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \RuntimeException(sprintf('Snippe request failed with HTTP %d.', $httpCode));
        }

        return $responsePayload ?? [];
    }
}
