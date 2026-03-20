<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Symfony\Component\HttpFoundation\Response;

final class AuthorizationFlowTest extends ApiTestCase
{
    public function testAuthorizationMatrixForCoreMarketplaceFlows(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("client_auth_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("vendor_auth_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("admin_auth_{$suffix}@test.com", $password, 'client');
        $outsiderRegistration = $this->registerUser("outsider_auth_{$suffix}@test.com", $password, 'client');
        $secondVendorRegistration = $this->registerUser("second_vendor_auth_{$suffix}@test.com", $password, 'vendor');

        $this->requestJson('GET', '/api/messages/inbox', token: $clientRegistration['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);
        $this->verifyUser($outsiderRegistration['verification_url']);
        $this->verifyUser($secondVendorRegistration['verification_url']);

        $this->promoteUserToAdmin($adminRegistration['user']['email']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Smoke Vendor');
        $this->seedVendorProfile((int) $secondVendorRegistration['user']['id'], 'Second Smoke Vendor');

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);
        $outsiderLogin = $this->loginUser($outsiderRegistration['user']['email'], $password);
        $secondVendorLogin = $this->loginUser($secondVendorRegistration['user']['email'], $password);

        $this->requestJson('GET', '/api/messages/inbox');
        self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);

        $this->requestJson('GET', '/api/messages/inbox', token: $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $serviceCreate = $this->requestJson('POST', '/api/services', [
            'title' => 'Smoke Test Service',
            'description' => 'Auth suite fixture',
            'category' => 'testing',
            'price_cents' => 250000,
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $serviceId = (int) $serviceCreate['id'];

        $bookingCreate = $this->requestJson('POST', '/api/bookings', [
            'service_id' => $serviceId,
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $bookingId = (int) $bookingCreate['booking_id'];

        $escrowId = $this->seedEscrow(
            "auth_escrow_{$suffix}",
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id']
        );

        $this->requestJson('POST', '/api/withdrawals', [
            'amount_minor' => 1000,
            'currency' => 'TZS',
            'msisdn' => '255700000001',
            'provider' => 'MPESA',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->requestJson('GET', '/api/admin/users', token: $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->requestJson('POST', '/api/withdrawals/999999/approve', [], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->requestJson('GET', '/api/admin/users', token: $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $this->requestJson('POST', '/api/withdrawals/999999/approve', [], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);

        $this->requestJson('POST', "/api/payments/escrows/{$escrowId}/collect", [
            'msisdn' => '255700000001',
            'provider' => 'MPESA',
        ], $outsiderLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->requestJson('POST', "/api/payments/escrows/{$escrowId}/collect", [
            'msisdn' => '255700000001',
            'provider' => 'MPESA',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->requestJson('POST', "/api/payments/escrows/{$escrowId}/collect", [], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);

        $this->requestJson('GET', "/api/bookings/{$bookingId}", token: $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $this->requestJson('GET', "/api/bookings/{$bookingId}", token: $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $this->requestJson('GET', "/api/bookings/{$bookingId}", token: $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $this->requestJson('GET', "/api/bookings/{$bookingId}", token: $outsiderLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->requestJson('PUT', "/api/bookings/{$bookingId}", [
            'status' => 'confirmed',
        ], $outsiderLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->requestJson('PUT', "/api/bookings/{$bookingId}", [
            'status' => 'completed',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $this->requestJson('POST', '/api/reviews', [
            'bookingId' => $bookingId,
            'rating' => 5,
            'comment' => 'Unauthorized review',
        ], $outsiderLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->requestJson('POST', '/api/reviews', [
            'bookingId' => $bookingId,
            'rating' => 5,
            'comment' => 'Legitimate review',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $this->requestJson('PUT', "/api/services/{$serviceId}", [
            'title' => 'Hijacked Title',
        ], $secondVendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);

        $this->requestJson('DELETE', "/api/services/{$serviceId}", token: $secondVendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);
    }
}
