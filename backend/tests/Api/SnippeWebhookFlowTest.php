<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Symfony\Component\HttpFoundation\Response;

final class SnippeWebhookFlowTest extends ApiTestCase
{
    public function testSignedWebhooksAreIdempotentAndAuditable(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';
        $email = "vendor_webhook_test_{$suffix}@test.com";

        $register = $this->registerUser($email, $password, 'vendor');

        $userId = (int) $register['user']['id'];
        $escrowReference = "escrow_signed_test_{$suffix}";
        $paymentReference = "payref_{$suffix}";

        $this->seedEscrow(
            $escrowReference,
            $userId,
            $userId,
            12000,
            'TZS',
            'CREATED',
            $paymentReference
        );

        $timestamp = (string) time();
        $collectionEventId = "evt_coll_{$suffix}";
        $collectionTransaction = "txn_{$suffix}";
        $collectionBody = $this->jsonEncode([
            'id' => $collectionEventId,
            'type' => 'payment.completed',
            'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
            'data' => [
                'reference' => $paymentReference,
                'status' => 'success',
                'external_reference' => $collectionTransaction,
                'metadata' => [
                    'order_id' => $escrowReference,
                ],
            ],
        ]);

        $collectionSignature = hash_hmac('sha256', $collectionBody, $this->webhookSecret());

        $firstCollection = $this->requestRawWebhook('/webhooks/snippe/collection', $collectionBody, $collectionSignature, $timestamp, 'payment.completed');
        self::assertResponseStatusCodeSame(Response::HTTP_ACCEPTED);
        self::assertSame('Webhook processed', $firstCollection['message'] ?? null);

        $duplicateCollection = $this->requestRawWebhook('/webhooks/snippe/collection', $collectionBody, $collectionSignature, $timestamp, 'payment.completed');
        self::assertResponseStatusCodeSame(Response::HTTP_ACCEPTED);
        self::assertSame('Duplicate webhook ignored', $duplicateCollection['message'] ?? null);

        self::assertSame(
            'ACTIVE',
            $this->db->fetchOne('SELECT status FROM escrow WHERE reference = :reference LIMIT 1', [
                'reference' => $escrowReference,
            ])
        );
        self::assertSame(
            $collectionTransaction,
            $this->db->fetchOne('SELECT external_transaction_id FROM escrow WHERE reference = :reference LIMIT 1', [
                'reference' => $escrowReference,
            ])
        );
        self::assertSame(
            '1',
            (string) $this->db->fetchOne('SELECT COUNT(*) FROM snippe_webhook_event WHERE event_id = :event_id', [
                'event_id' => $collectionEventId,
            ])
        );
        self::assertSame(
            '2',
            (string) $this->db->fetchOne('SELECT COUNT(*) FROM wallet_ledger_entry WHERE reference = :reference', [
                'reference' => $escrowReference,
            ])
        );

        $payoutEventId = "evt_payout_{$suffix}";
        $payoutReference = "payout_signed_test_{$suffix}";
        $payoutTransaction = "txp_{$suffix}";
        $payoutBody = $this->jsonEncode([
            'id' => $payoutEventId,
            'type' => 'payout.completed',
            'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
            'data' => [
                'reference' => $payoutReference,
                'status' => 'success',
                'external_reference' => $payoutTransaction,
                'metadata' => [
                    'order_id' => $payoutReference,
                ],
            ],
        ]);

        $payoutSignature = hash_hmac('sha256', $payoutBody, $this->webhookSecret());

        $firstPayout = $this->requestRawWebhook('/webhooks/snippe/payout', $payoutBody, $payoutSignature, $timestamp, 'payout.completed');
        self::assertResponseStatusCodeSame(Response::HTTP_ACCEPTED);
        self::assertSame('Webhook recorded but not applied', $firstPayout['message'] ?? null);

        $duplicatePayout = $this->requestRawWebhook('/webhooks/snippe/payout', $payoutBody, $payoutSignature, $timestamp, 'payout.completed');
        self::assertResponseStatusCodeSame(Response::HTTP_ACCEPTED);
        self::assertSame('Duplicate webhook ignored', $duplicatePayout['message'] ?? null);
    }

    private function webhookSecret(): string
    {
        $secret = $_SERVER['SNIPPE_WEBHOOK_SECRET'] ?? $_ENV['SNIPPE_WEBHOOK_SECRET'] ?? getenv('SNIPPE_WEBHOOK_SECRET') ?: '';

        self::assertNotSame('', $secret, 'SNIPPE_WEBHOOK_SECRET must be available in the test environment.');

        return (string) $secret;
    }
}
