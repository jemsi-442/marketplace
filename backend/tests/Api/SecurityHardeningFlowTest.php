<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Service\VendorWalletService;
use App\Tests\Double\FakeSnippeClient;
use Symfony\Component\HttpFoundation\Response;

final class SecurityHardeningFlowTest extends ApiTestCase
{
    public function testLoginRateLimitsRepeatedInvalidAttempts(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';
        $registration = $this->registerUser("login_guard_{$suffix}@test.com", $password, 'client');
        $this->verifyUser($registration['verification_url']);
        $email = $registration['user']['email'];

        for ($attempt = 0; $attempt < 5; ++$attempt) {
            $response = $this->requestJson('POST', '/api/login', [
                'email' => $email,
                'password' => 'WrongPassword123!',
            ]);
            self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
            self::assertSame('Invalid credentials', $response['error'] ?? null);
        }

        $rateLimited = $this->requestJson('POST', '/api/login', [
            'email' => $email,
            'password' => 'WrongPassword123!',
        ]);
        self::assertResponseStatusCodeSame(Response::HTTP_TOO_MANY_REQUESTS);
        self::assertSame('Too many login attempts. Try again later.', $rateLimited['error'] ?? null);
    }

    public function testResendVerificationRateLimitsBurstRequests(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';
        $registration = $this->registerUser("resend_guard_{$suffix}@test.com", $password, 'client');
        $email = $registration['user']['email'];

        for ($attempt = 0; $attempt < 3; ++$attempt) {
            $response = $this->requestJson('POST', '/api/auth/resend-verification', [
                'email' => $email,
            ]);
            self::assertResponseStatusCodeSame(Response::HTTP_OK);
            self::assertSame(
                'If the account still needs verification, a new verification link has been prepared.',
                $response['message'] ?? null
            );
        }

        $rateLimited = $this->requestJson('POST', '/api/auth/resend-verification', [
            'email' => $email,
        ]);
        self::assertResponseStatusCodeSame(Response::HTTP_TOO_MANY_REQUESTS);
        self::assertSame('Too many verification requests. Try again later.', $rateLimited['error'] ?? null);
    }

    public function testAiQuestionRejectsOversizedInputAndRateLimitsBurstTraffic(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("ai_guard_client_{$suffix}@test.com", $password, 'client');
        $adminRegistration = $this->registerUser("ai_guard_admin_{$suffix}@test.com", $password, 'client');
        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->db->executeStatement(
            'UPDATE user SET roles = :roles WHERE email = :email',
            [
                'roles' => '["ROLE_ADMIN"]',
                'email' => $adminRegistration['user']['email'],
            ]
        );

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $denied = $this->requestJson('POST', '/api/ai/question', [
            'question' => 'Can I use the internal AI route from the client lane?',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->requestJson('POST', '/api/ai/question', [
            'question' => str_repeat('service ', 101),
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        for ($attempt = 0; $attempt < 10; ++$attempt) {
            $this->requestJson('POST', '/api/ai/question', [
                'question' => sprintf('Which service should I review first for booking burst %d?', $attempt),
                'context_tag' => 'client_dashboard',
                'context' => [
                    'booking_id' => 123,
                    'notes' => str_repeat('follow-up ', 40),
                ],
            ], $adminLogin['token']);
            self::assertResponseStatusCodeSame(Response::HTTP_OK);
        }

        $rateLimited = $this->requestJson('POST', '/api/ai/question', [
            'question' => 'Which service should I review after the burst window?',
            'context_tag' => 'client_dashboard',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_TOO_MANY_REQUESTS);
        self::assertSame('Too many AI requests. Slow down and try again shortly.', $rateLimited['error'] ?? null);
    }

    public function testClientRequestCreationRateLimitsBurstSubmissions(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("request_guard_client_{$suffix}@test.com", $password, 'client');
        $this->verifyUser($clientRegistration['verification_url']);
        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);

        $serviceTypeId = $this->firstServiceTypeId();

        for ($attempt = 0; $attempt < 5; ++$attempt) {
            $response = $this->requestJson('POST', '/api/client-requests', [
                'service_type_id' => $serviceTypeId,
                'request_summary' => sprintf('Burst request number %d for limiter coverage', $attempt + 1),
                'scope_details' => 'Need stable creation-rate coverage for platform-managed request fan-out.',
            ], $clientLogin['token']);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
            self::assertSame('Service request created', $response['message'] ?? null);
        }

        $rateLimited = $this->requestJson('POST', '/api/client-requests', [
            'service_type_id' => $serviceTypeId,
            'request_summary' => 'This request should be throttled by the burst limiter',
            'scope_details' => 'Need the sixth submission to be rejected with a rate-limit response.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_TOO_MANY_REQUESTS);
        self::assertSame(
            'Too many request submissions. Please wait before opening another lane.',
            $rateLimited['error'] ?? null
        );
    }

    public function testCollectionAndPayoutIgnoreClientSuppliedCallbackUrls(): void
    {
        FakeSnippeClient::$calls = [];

        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("callback_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("callback_vendor_{$suffix}@test.com", $password, 'vendor');
        $superAdminRegistration = $this->registerUser("callback_super_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($superAdminRegistration['verification_url']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Callback Fixture Vendor');
        $this->db->executeStatement(
            'UPDATE user SET roles = :roles WHERE email = :email',
            [
                'roles' => '["ROLE_SUPER_ADMIN"]',
                'email' => $superAdminRegistration['user']['email'],
            ]
        );

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $superAdminLogin = $this->loginUser($superAdminRegistration['user']['email'], $password);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need callback-safe payment flow setup.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $escrowCreate = $this->requestJson('POST', sprintf('/api/bookings/%d/escrow', $bookingId), [], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $escrowId = (int) ($escrowCreate['escrow']['id'] ?? 0);
        self::assertGreaterThan(0, $escrowId);

        $collectionResponse = $this->requestJson('POST', sprintf('/api/payments/escrows/%d/collect', $escrowId), [
            'msisdn' => '255700000111',
            'provider' => 'MPESA',
            'callback_url' => 'https://evil.example/steal-collection',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        self::assertStringContainsString('/api/payments/webhooks/collection', (string) (($collectionResponse['gateway']['data']['webhook_url'] ?? '')));
        self::assertStringNotContainsString('evil.example', (string) (($collectionResponse['gateway']['data']['webhook_url'] ?? '')));

        /** @var VendorWalletService $walletService */
        $walletService = static::getContainer()->get(VendorWalletService::class);
        $vendorUser = $this->reloadUserByEmail($vendorRegistration['user']['email']);
        $walletService->manualCreditVendor(
            $vendorUser,
            100000,
            'TZS',
            'callback_test_wallet_funding_' . $suffix,
            'callback_test_wallet_funding_' . $suffix,
            ['movement' => 'TEST_FUNDING']
        );

        $withdrawalCreate = $this->requestJson('POST', '/api/withdrawals', [
            'amount_minor' => 50000,
            'currency' => 'TZS',
            'msisdn' => '255700000222',
            'provider' => 'MPESA',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $withdrawalId = (int) ($withdrawalCreate['id'] ?? 0);
        self::assertGreaterThan(0, $withdrawalId);

        $approveResponse = $this->requestJson('POST', sprintf('/api/withdrawals/%d/approve', $withdrawalId), [
            'callback_url' => 'https://evil.example/steal-payout',
        ], $superAdminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $lastCall = FakeSnippeClient::$calls[array_key_last(FakeSnippeClient::$calls)] ?? null;
        self::assertIsArray($lastCall);
        self::assertSame('payout', $lastCall['operation'] ?? null);
        self::assertStringContainsString('/api/payments/webhooks/payout', (string) ($lastCall['callback_url'] ?? ''));
        self::assertStringNotContainsString('evil.example', (string) ($lastCall['callback_url'] ?? ''));
    }

    public function testMessagesRequireAdminBridgeAndExposeMaskedLabelsOnly(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("msg_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("msg_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("msg_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Message Fixture Vendor');
        $this->promoteUserToAdmin($adminRegistration['user']['email']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need admin-managed booking thread coverage.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $forbidden = $this->requestJson('POST', sprintf('/api/messages/bookings/%d', $bookingId), [
            'receiverId' => (int) $vendorRegistration['user']['id'],
            'content' => 'This direct client to vendor message should be blocked.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);
        self::assertSame(
            'Booking communication must go through WOLFIX admin coordination.',
            $forbidden['error'] ?? null
        );

        $this->requestJson('POST', sprintf('/api/messages/bookings/%d', $bookingId), [
            'receiverId' => (int) $vendorRegistration['user']['id'],
            'content' => 'Admin is coordinating this platform-managed request.',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $inbox = $this->requestJson('GET', sprintf('/api/messages/bookings/%d', $bookingId), null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertNotEmpty($inbox['messages'] ?? []);

        $firstMessage = $inbox['messages'][0] ?? null;
        self::assertIsArray($firstMessage);
        self::assertArrayHasKey('senderLabel', $firstMessage);
        self::assertArrayHasKey('receiverLabel', $firstMessage);
        self::assertArrayNotHasKey('senderEmail', $firstMessage);
        self::assertArrayNotHasKey('receiverEmail', $firstMessage);
    }

    public function testMessageSendRateLimitsBurstTrafficThroughAdminBridge(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("msg_burst_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("msg_burst_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("msg_burst_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);
        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Burst Fixture Vendor');
        $this->promoteUserToAdmin($adminRegistration['user']['email']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need limiter coverage for booking thread updates.'
        );
        $bookingId = $bookingFixture['booking_id'];

        for ($attempt = 0; $attempt < 20; ++$attempt) {
            $this->requestJson('POST', sprintf('/api/messages/bookings/%d', $bookingId), [
                'receiverId' => (int) $vendorRegistration['user']['id'],
                'content' => sprintf('Burst message %d for limiter coverage.', $attempt),
            ], $adminLogin['token']);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        }

        $rateLimited = $this->requestJson('POST', sprintf('/api/messages/bookings/%d', $bookingId), [
            'receiverId' => (int) $vendorRegistration['user']['id'],
            'content' => 'This message should be throttled.',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_TOO_MANY_REQUESTS);
        self::assertSame('Too many messages sent too quickly. Please slow down.', $rateLimited['error'] ?? null);
    }

    public function testOnlySuperAdminCanLockAnotherAdmin(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $adminOne = $this->registerUser("admin_one_{$suffix}@test.com", $password, 'client');
        $adminTwo = $this->registerUser("admin_two_{$suffix}@test.com", $password, 'client');
        $superAdmin = $this->registerUser("super_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($adminOne['verification_url']);
        $this->verifyUser($adminTwo['verification_url']);
        $this->verifyUser($superAdmin['verification_url']);

        $this->promoteUserToAdmin($adminOne['user']['email']);
        $this->promoteUserToAdmin($adminTwo['user']['email']);
        $this->db->executeStatement(
            'UPDATE user SET roles = :roles WHERE email = :email',
            [
                'roles' => '["ROLE_SUPER_ADMIN"]',
                'email' => $superAdmin['user']['email'],
            ]
        );

        $adminOneLogin = $this->loginUser($adminOne['user']['email'], $password);
        $superAdminLogin = $this->loginUser($superAdmin['user']['email'], $password);

        $forbidden = $this->requestJson('POST', sprintf('/api/admin/users/%d/lock', (int) $adminTwo['user']['id']), [], $adminOneLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);
        self::assertSame('Only a super admin can lock another admin account', $forbidden['error'] ?? null);

        $allowed = $this->requestJson('POST', sprintf('/api/admin/users/%d/lock', (int) $adminTwo['user']['id']), [], $superAdminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertTrue((bool) ($allowed['user']['is_locked'] ?? false));

        $withdrawalList = $this->requestJson('GET', '/api/withdrawals', null, $superAdminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertIsArray($withdrawalList);
    }

    public function testAdminCannotReviewCompletedBookingAndCannotResolveUndisputedEscrow(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("review_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("review_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("review_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);
        $this->promoteUserToAdmin($adminRegistration['user']['email']);
        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Review Fixture Vendor');

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need review flow coverage for this booking.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $this->requestJson('PUT', sprintf('/api/bookings/%d', $bookingId), [
            'status' => 'completed',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $reviewAttempt = $this->requestJson('POST', '/api/reviews', [
            'bookingId' => $bookingId,
            'rating' => 5,
            'comment' => 'Admin should not be able to submit this review.',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);
        self::assertSame('You are not allowed to review this booking', $reviewAttempt['error'] ?? null);

        $escrowId = $this->seedEscrow(
            "undisputed_{$suffix}",
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            status: 'CREATED'
        );

        $resolveAttempt = $this->requestJson('POST', sprintf('/api/admin/escrow/resolve/%d', $escrowId), [
            'release_to_vendor' => true,
            'resolution_note' => 'This should be rejected before any state change.',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CONFLICT);
        self::assertSame('Only disputed escrows can be resolved', $resolveAttempt['error'] ?? null);
    }
}
