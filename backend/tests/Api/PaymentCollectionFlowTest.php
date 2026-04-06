<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Double\FakeSnippeClient;
use Symfony\Component\HttpFoundation\Response;

final class PaymentCollectionFlowTest extends ApiTestCase
{
    public function testCollectionNormalizesTanzaniaMsisdnAndProviderBeforeGatewayCall(): void
    {
        FakeSnippeClient::$calls = [];

        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("client_payment_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("vendor_payment_{$suffix}@test.com", $password, 'vendor');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);

        $escrowId = $this->seedEscrow(
            "payment_collect_{$suffix}",
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
        );

        $response = $this->requestJson('POST', "/api/payments/escrows/{$escrowId}/collect", [
            'msisdn' => '0712345678',
            'provider' => 'm-pesa',
        ], $clientLogin['token']);

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        self::assertSame('Payment prompt sent', $response['message'] ?? null);
        self::assertSame('255712345678', $response['gateway']['data']['msisdn'] ?? null);
        self::assertSame('MPESA', $response['gateway']['data']['provider'] ?? null);

        $lastCall = FakeSnippeClient::$calls[array_key_last(FakeSnippeClient::$calls)] ?? null;
        self::assertIsArray($lastCall);
        self::assertSame('255712345678', $lastCall['msisdn'] ?? null);
        self::assertSame('MPESA', $lastCall['provider'] ?? null);
    }

    public function testCollectionRejectsUnsupportedProviderInvalidMsisdnAndNonCreatedEscrow(): void
    {
        FakeSnippeClient::$calls = [];

        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("client_payment_guard_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("vendor_payment_guard_{$suffix}@test.com", $password, 'vendor');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);

        $createdEscrowId = $this->seedEscrow(
            "payment_invalid_{$suffix}",
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
        );

        $badProvider = $this->requestJson('POST', "/api/payments/escrows/{$createdEscrowId}/collect", [
            'msisdn' => '0712345678',
            'provider' => 'UNKNOWNPAY',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
        self::assertSame('Unsupported mobile money provider', $badProvider['error'] ?? null);

        $badMsisdn = $this->requestJson('POST', "/api/payments/escrows/{$createdEscrowId}/collect", [
            'msisdn' => '12345',
            'provider' => 'MPESA',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
        self::assertStringContainsString('valid Tanzania mobile number', (string) ($badMsisdn['error'] ?? ''));

        $activeEscrowId = $this->seedEscrow(
            "payment_active_{$suffix}",
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            250000,
            'TZS',
            'ACTIVE',
            'existing_payment_reference_' . $suffix
        );

        $invalidState = $this->requestJson('POST', "/api/payments/escrows/{$activeEscrowId}/collect", [
            'msisdn' => '255712345678',
            'provider' => 'MPESA',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CONFLICT);
        self::assertSame('Payment prompt can only be sent while escrow is awaiting funding', $invalidState['error'] ?? null);

        self::assertCount(0, FakeSnippeClient::$calls);
    }

    public function testCollectionReturnsConflictWhenEscrowRequiresManualReview(): void
    {
        FakeSnippeClient::$calls = [];

        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("client_payment_review_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("vendor_payment_review_{$suffix}@test.com", $password, 'vendor');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);

        $escrowId = $this->seedEscrow(
            "payment_review_{$suffix}",
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
        );

        $this->db->executeStatement(
            'UPDATE escrow SET risk_metadata = :risk_metadata WHERE id = :id',
            [
                'risk_metadata' => json_encode(['manual_review_required' => true], JSON_THROW_ON_ERROR),
                'id' => $escrowId,
            ]
        );

        $response = $this->requestJson('POST', "/api/payments/escrows/{$escrowId}/collect", [
            'msisdn' => '0712345678',
            'provider' => 'MPESA',
        ], $clientLogin['token']);

        self::assertResponseStatusCodeSame(Response::HTTP_CONFLICT);
        self::assertSame('Escrow is flagged for manual review before collection.', $response['error'] ?? null);
        self::assertCount(0, FakeSnippeClient::$calls);
    }
}
