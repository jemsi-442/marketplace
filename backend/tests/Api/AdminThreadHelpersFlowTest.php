<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Symfony\Component\HttpFoundation\Response;

final class AdminThreadHelpersFlowTest extends ApiTestCase
{
    public function testAdminCanListRequestAndBookingThreadSummariesFromUnifiedEndpoint(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("thread_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("thread_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("thread_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Thread Fixture Vendor');
        $this->seedVendorServiceCapability((int) $vendorRegistration['user']['id'], $this->firstServiceTypeId(), 180000);
        $this->promoteUserToAdmin($adminRegistration['user']['email']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $requestCreate = $this->requestJson('POST', '/api/client-requests', [
            'service_type_id' => $this->firstServiceTypeId(),
            'request_summary' => 'Need a platform-managed website build with admin coordination.',
            'scope_details' => 'Landing page plus lead form and analytics setup.',
            'deadline_note' => 'Within seven working days',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $requestId = (int) ($requestCreate['request']['id'] ?? 0);

        $requestMessage = $this->requestJson('POST', sprintf('/api/messages/client-requests/%d', $requestId), [
            'receiverId' => (int) $adminRegistration['user']['id'],
            'content' => 'Please help me understand the next approval step for this request.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $requestThreads = $this->requestJson('GET', '/api/messages/thread-summaries?view=request', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertNotEmpty($requestThreads['items'] ?? []);
        self::assertSame(1, $requestThreads['summary']['requests'] ?? null);
        self::assertSame(0, $requestThreads['summary']['bookings'] ?? null);
        self::assertSame($requestId, $requestThreads['items'][0]['id'] ?? null);
        self::assertSame('request', $requestThreads['items'][0]['kind'] ?? null);
        self::assertSame(1, $requestThreads['items'][0]['unread_count'] ?? null);
        self::assertSame((int) $clientRegistration['user']['id'], $requestThreads['items'][0]['participant_id'] ?? null);

        $searchedRequestThreads = $this->requestJson('GET', '/api/messages/thread-summaries?view=request&search=website', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $searchedRequestThreads['total_items'] ?? null);
        self::assertSame($requestId, $searchedRequestThreads['items'][0]['id'] ?? null);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need a booking thread summary fixture.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $bookingMessage = $this->requestJson('POST', sprintf('/api/messages/bookings/%d', $bookingId), [
            'receiverId' => (int) $adminRegistration['user']['id'],
            'content' => 'Vendor is ready to coordinate the first booking milestone.',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $bookingThreads = $this->requestJson('GET', '/api/messages/thread-summaries?view=booking', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertNotEmpty($bookingThreads['items'] ?? []);
        self::assertSame(1, $bookingThreads['summary']['requests'] ?? null);
        self::assertSame(1, $bookingThreads['summary']['bookings'] ?? null);
        self::assertSame($bookingId, $bookingThreads['items'][0]['id'] ?? null);
        self::assertSame('booking', $bookingThreads['items'][0]['kind'] ?? null);
        self::assertSame(1, $bookingThreads['items'][0]['unread_count'] ?? null);
        self::assertSame((int) $vendorRegistration['user']['id'], $bookingThreads['items'][0]['participant_id'] ?? null);
        self::assertStringContainsString((string) $bookingId, (string) ($bookingThreads['items'][0]['title'] ?? ''));

        $searchedBookingThreads = $this->requestJson('GET', '/api/messages/thread-summaries?view=booking&search=thread fixture vendor', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $searchedBookingThreads['total_items'] ?? null);
        self::assertSame($bookingId, $searchedBookingThreads['items'][0]['id'] ?? null);

        $adminUnreadSummary = $this->requestJson('GET', '/api/messages/unread-summary', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $adminUnreadSummary['request_unread'] ?? null);
        self::assertSame(1, $adminUnreadSummary['booking_unread'] ?? null);
        self::assertSame(2, $adminUnreadSummary['total_unread'] ?? null);
    }
}
