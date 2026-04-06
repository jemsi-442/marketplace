<?php

declare(strict_types=1);

namespace App\Tests\Double;

use App\Service\SnippeClient;

final class FakeSnippeClient extends SnippeClient
{
    public static array $calls = [];
    public static bool $failPayout = false;

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
        self::$calls[] = [
            'operation' => 'collection',
            'reference' => $reference,
            'callback_url' => $callbackUrl,
            'msisdn' => $msisdn,
            'provider' => strtoupper($provider),
            'idempotency_key' => $idempotencyKey,
        ];

        return [
            'status' => 'success',
            'data' => [
                'reference' => 'fake_collection_' . $reference,
                'external_reference' => 'fake_collection_txn_' . $reference,
                'amount' => $amountMinor,
                'currency' => strtoupper($currency),
                'provider' => strtoupper($provider),
                'msisdn' => $msisdn,
                'webhook_url' => $callbackUrl,
                'metadata' => $metadata,
                'idempotency_key' => $idempotencyKey,
            ],
        ];
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
        if (self::$failPayout) {
            throw new \RuntimeException('Simulated payout provider failure');
        }

        self::$calls[] = [
            'operation' => 'payout',
            'reference' => $reference,
            'callback_url' => $callbackUrl,
            'provider' => strtoupper($provider),
            'idempotency_key' => $idempotencyKey,
        ];

        return [
            'status' => 'success',
            'data' => [
                'reference' => 'payout_' . $reference,
                'external_reference' => 'fake_payout_txn_' . $reference,
                'amount' => $amountMinor,
                'currency' => strtoupper($currency),
                'provider' => strtoupper($provider),
                'recipient_phone' => $msisdn,
                'recipient_name' => $recipientName,
                'webhook_url' => $callbackUrl,
                'metadata' => $metadata,
                'idempotency_key' => $idempotencyKey,
            ],
        ];
    }
}
