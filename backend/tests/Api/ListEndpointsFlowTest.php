<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Service\VendorWalletService;
use Symfony\Component\HttpFoundation\Response;

final class ListEndpointsFlowTest extends ApiTestCase
{
    public function testMarketplaceListEndpointsReturnPaginatedShapesAndHonorViewFilters(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("lists_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("lists_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("lists_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->promoteUserToAdmin($adminRegistration['user']['email']);
        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'List Fixture Vendor');

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $serviceTypeId = $this->firstServiceTypeId();
        $this->seedVendorServiceCapability((int) $vendorRegistration['user']['id'], $serviceTypeId, 250000);

        $alphaRequest = $this->requestJson('POST', '/api/client-requests', [
            'service_type_id' => $serviceTypeId,
            'request_summary' => 'Alpha request for vendor matching',
            'scope_details' => 'Need the alpha workflow covered.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $betaRequest = $this->requestJson('POST', '/api/client-requests', [
            'service_type_id' => $serviceTypeId,
            'request_summary' => 'Beta request waiting for payment',
            'scope_details' => 'Need the beta workflow covered.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $gammaRequest = $this->requestJson('POST', '/api/client-requests', [
            'service_type_id' => $serviceTypeId,
            'request_summary' => 'Gamma request already completed',
            'scope_details' => 'Need the gamma workflow covered.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $alphaRequestId = (int) ($alphaRequest['request']['id'] ?? 0);
        $betaRequestId = (int) ($betaRequest['request']['id'] ?? 0);
        $gammaRequestId = (int) ($gammaRequest['request']['id'] ?? 0);

        self::assertGreaterThan(0, $alphaRequestId);
        self::assertGreaterThan(0, $betaRequestId);
        self::assertGreaterThan(0, $gammaRequestId);

        $this->db->executeStatement(
            'UPDATE client_request SET status = :status, updated_at = NOW() WHERE id = :id',
            ['status' => 'awaiting_payment', 'id' => $betaRequestId]
        );
        $this->db->executeStatement(
            'UPDATE client_request SET status = :status, updated_at = NOW() WHERE id = :id',
            ['status' => 'completed', 'id' => $gammaRequestId]
        );

        $clientRequests = $this->requestJson('GET', '/api/client-requests?view=active&limit=1&page=1', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $clientRequests['page'] ?? null);
        self::assertSame(1, $clientRequests['page_size'] ?? null);
        self::assertSame(2, $clientRequests['total_items'] ?? null);
        self::assertSame(2, $clientRequests['summary']['active'] ?? null);
        self::assertSame(1, $clientRequests['summary']['awaiting_payment'] ?? null);
        self::assertSame(1, $clientRequests['summary']['completed'] ?? null);
        self::assertCount(1, $clientRequests['items'] ?? []);

        $vendorNeedsProposal = $this->requestJson('GET', '/api/vendor/request-feed?view=needs_proposal&search=alpha&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $vendorNeedsProposal['total_items'] ?? null);
        self::assertSame('Alpha request for vendor matching', $vendorNeedsProposal['items'][0]['request_summary'] ?? null);

        $vendorInterest = $this->requestJson('POST', sprintf('/api/client-requests/%d/interest', $alphaRequestId), [
            'proposed_price_minor' => 320000,
            'price_reason' => 'Alpha scope needs a stronger working budget.',
            'timeline_note' => '4 working days',
            'message' => 'Ready to take the alpha request.',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $vendorSent = $this->requestJson('GET', '/api/vendor/request-feed?view=sent&search=alpha&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $vendorSent['total_items'] ?? null);
        self::assertSame(1, $vendorSent['summary']['sent'] ?? null);
        self::assertSame('Alpha request for vendor matching', $vendorSent['items'][0]['request_summary'] ?? null);

        $adminRequests = $this->requestJson('GET', '/api/admin/client-requests?view=awaiting_payment&search=beta&limit=10&page=1', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $adminRequests['total_items'] ?? null);
        self::assertSame(1, $adminRequests['summary']['awaiting_payment'] ?? null);
        self::assertSame('Beta request waiting for payment', $adminRequests['items'][0]['request_summary'] ?? null);

        $adminUsers = $this->requestJson('GET', '/api/admin/users?view=vendor&search=lists_vendor&limit=10&page=1', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $adminUsers['total_items'] ?? null);
        self::assertSame(1, $adminUsers['summary']['vendors'] ?? null);
        self::assertSame('vendor', $adminUsers['items'][0]['account_type'] ?? null);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need unread booking list coverage.'
        );
        $bookingId = $bookingFixture['booking_id'];
        self::assertGreaterThan(0, $bookingId);

        $this->requestJson('POST', sprintf('/api/messages/bookings/%d', $bookingId), [
            'receiverId' => (int) $clientRegistration['user']['id'],
            'content' => 'Admin update for the unread bookings list fixture.',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $this->requestJson('POST', sprintf('/api/messages/bookings/%d', $bookingId), [
            'receiverId' => (int) $clientRegistration['user']['id'],
            'content' => 'Second unread update for the same booking fixture.',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $bookings = $this->requestJson('GET', '/api/bookings?view=unread&limit=10&page=1', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $bookings['total_items'] ?? null);
        self::assertSame(1, $bookings['summary']['unread'] ?? null);
        self::assertSame($bookingId, $bookings['items'][0]['id'] ?? null);
        self::assertGreaterThan(0, (int) ($bookings['items'][0]['unread_thread_count'] ?? 0));

        $unreadSummary = $this->requestJson('GET', '/api/messages/unread-summary', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(0, $unreadSummary['request_unread'] ?? null);
        self::assertSame(1, $unreadSummary['booking_unread'] ?? null);
        self::assertSame(1, $unreadSummary['total_unread'] ?? null);

        $bookingSummary = $this->requestJson('GET', '/api/bookings/summary', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $bookingSummary['unread'] ?? null);
    }

    public function testNotificationsThreadSummariesAndWithdrawalsListsSupportPaginatedContracts(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("list_notifications_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("list_withdraw_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("list_notifications_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->promoteUserToAdmin($adminRegistration['user']['email']);
        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Withdraw Fixture Vendor');

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $this->seedNotification((int) $clientRegistration['user']['id'], 'Unread message alert', 'Open the inbox for the unread message.', 'message', false);
        $this->seedNotification((int) $clientRegistration['user']['id'], 'Read finance alert', 'Already handled finance notice.', 'finance', true);

        $notifications = $this->requestJson('GET', '/api/notifications?view=unread&category=message&limit=10&page=1', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $notifications['total_items'] ?? null);
        self::assertSame(2, $notifications['summary']['total'] ?? null);
        self::assertSame(1, $notifications['summary']['unread'] ?? null);
        self::assertSame(1, $notifications['summary']['visible'] ?? null);
        self::assertSame('Unread message alert', $notifications['items'][0]['title'] ?? null);

        $notificationSummary = $this->requestJson('GET', '/api/notifications/summary', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(2, $notificationSummary['total'] ?? null);
        self::assertSame(1, $notificationSummary['unread'] ?? null);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need unread thread summary coverage.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $this->requestJson('POST', sprintf('/api/messages/bookings/%d', $bookingId), [
            'receiverId' => (int) $clientRegistration['user']['id'],
            'content' => 'Unread booking thread summary fixture.',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $this->requestJson('POST', sprintf('/api/messages/bookings/%d', $bookingId), [
            'receiverId' => (int) $clientRegistration['user']['id'],
            'content' => 'Second unread booking thread summary fixture message.',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $threadSummaries = $this->requestJson('GET', '/api/messages/thread-summaries?view=unread&limit=10&page=1', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $threadSummaries['page'] ?? null);
        self::assertSame(1, $threadSummaries['summary']['unread'] ?? null);
        self::assertNotEmpty($threadSummaries['items'] ?? []);
        self::assertSame('booking', $threadSummaries['items'][0]['kind'] ?? null);
        self::assertSame('Second unread booking thread summary fixture message.', $threadSummaries['items'][0]['preview'] ?? null);

        /** @var VendorWalletService $walletService */
        $walletService = static::getContainer()->get(VendorWalletService::class);
        $vendorUser = $this->reloadUserByEmail($vendorRegistration['user']['email']);
        $walletService->manualCreditVendor(
            $vendorUser,
            100000,
            'TZS',
            'list_withdraw_funding_' . $suffix,
            'list_withdraw_funding_' . $suffix,
            ['movement' => 'TEST_FUNDING']
        );

        $firstWithdrawal = $this->requestJson('POST', '/api/withdrawals', [
            'amount_minor' => 10000,
            'currency' => 'TZS',
            'msisdn' => '255700001111',
            'provider' => 'MPESA',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $secondWithdrawal = $this->requestJson('POST', '/api/withdrawals', [
            'amount_minor' => 15000,
            'currency' => 'TZS',
            'msisdn' => '255700001112',
            'provider' => 'MPESA',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $secondWithdrawalId = (int) ($secondWithdrawal['id'] ?? 0);
        self::assertGreaterThan(0, $secondWithdrawalId);

        $this->requestJson('POST', sprintf('/api/withdrawals/%d/approve', $secondWithdrawalId), [], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $withdrawals = $this->requestJson('GET', '/api/withdrawals?view=processing&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $withdrawals['total_items'] ?? null);
        self::assertSame(2, $withdrawals['summary']['total'] ?? null);
        self::assertSame(1, $withdrawals['summary']['pending'] ?? null);
        self::assertSame(1, $withdrawals['summary']['processing'] ?? null);
        self::assertSame('PROCESSING', $withdrawals['items'][0]['status'] ?? null);

        $disputedEscrowId = $this->seedEscrow(
            "escrow_dispute_{$suffix}",
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            80000,
            'TZS',
            'DISPUTED'
        );
        self::assertGreaterThan(0, $disputedEscrowId);

        $disputedEscrows = $this->requestJson('GET', '/api/admin/escrow/list?search=escrow_dispute&limit=10&page=1', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $disputedEscrows['total_items'] ?? null);
        self::assertSame(1, $disputedEscrows['summary']['disputed'] ?? null);
        self::assertSame("escrow_dispute_{$suffix}", $disputedEscrows['items'][0]['reference'] ?? null);
    }

    public function testListEndpointsHandleInvalidViewsEmptyResultsAndLastPagesGracefully(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("lists_edge_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("lists_edge_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("lists_edge_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->promoteUserToAdmin($adminRegistration['user']['email']);
        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'List Edge Vendor');

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $serviceTypeId = $this->firstServiceTypeId();
        $this->seedVendorServiceCapability((int) $vendorRegistration['user']['id'], $serviceTypeId, 180000);

        foreach (['First edge request', 'Second edge request', 'Third edge request'] as $summary) {
            $this->requestJson('POST', '/api/client-requests', [
                'service_type_id' => $serviceTypeId,
                'request_summary' => $summary,
                'scope_details' => 'Edge-case pagination coverage.',
            ], $clientLogin['token']);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        }

        $fallbackView = $this->requestJson('GET', '/api/client-requests?view=not-real&limit=1&page=3', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(3, $fallbackView['page'] ?? null);
        self::assertSame(3, $fallbackView['total_pages'] ?? null);
        self::assertSame(3, $fallbackView['total_items'] ?? null);
        self::assertCount(1, $fallbackView['items'] ?? []);
        self::assertContains(
            $fallbackView['items'][0]['request_summary'] ?? null,
            ['First edge request', 'Second edge request', 'Third edge request']
        );

        $clampedClientPage = $this->requestJson('GET', '/api/client-requests?view=all&limit=2&page=99', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(2, $clampedClientPage['page'] ?? null);
        self::assertSame(2, $clampedClientPage['total_pages'] ?? null);
        self::assertCount(1, $clampedClientPage['items'] ?? []);

        $emptyAdminUsers = $this->requestJson('GET', '/api/admin/users?search=no-match-here&limit=10&page=1', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(0, $emptyAdminUsers['total_items'] ?? null);
        self::assertSame(1, $emptyAdminUsers['total_pages'] ?? null);
        self::assertSame([], $emptyAdminUsers['items'] ?? null);

        $this->seedNotification((int) $clientRegistration['user']['id'], 'Edge unread alert', 'This alert exists but should not match the search.', 'platform', false);
        $emptyNotifications = $this->requestJson('GET', '/api/notifications?view=all&search=does-not-exist&limit=10&page=1', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(0, $emptyNotifications['total_items'] ?? null);
        self::assertSame(1, $emptyNotifications['total_pages'] ?? null);
        self::assertSame(0, $emptyNotifications['summary']['visible'] ?? null);

        /** @var VendorWalletService $walletService */
        $walletService = static::getContainer()->get(VendorWalletService::class);
        $vendorUser = $this->reloadUserByEmail($vendorRegistration['user']['email']);
        $walletService->manualCreditVendor(
            $vendorUser,
            50000,
            'TZS',
            'edge_withdraw_funding_' . $suffix,
            'edge_withdraw_funding_' . $suffix,
            ['movement' => 'TEST_FUNDING']
        );

        $withdrawal = $this->requestJson('POST', '/api/withdrawals', [
            'amount_minor' => 12000,
            'currency' => 'TZS',
            'msisdn' => '255700009999',
            'provider' => 'MPESA',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $withdrawalFallback = $this->requestJson('GET', '/api/withdrawals?view=bogus&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $withdrawalFallback['total_items'] ?? null);
        self::assertSame(1, $withdrawalFallback['summary']['total'] ?? null);
        self::assertSame('REQUESTED', $withdrawalFallback['items'][0]['status'] ?? null);

        $emptyThreadSummaries = $this->requestJson('GET', '/api/messages/thread-summaries?view=request&search=does-not-exist&limit=10&page=1', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(0, $emptyThreadSummaries['total_items'] ?? null);
        self::assertSame(1, $emptyThreadSummaries['total_pages'] ?? null);
        self::assertSame([], $emptyThreadSummaries['items'] ?? null);
        self::assertSame(0, $emptyThreadSummaries['summary']['total'] ?? null);
        self::assertSame(0, $emptyThreadSummaries['summary']['requests'] ?? null);
        self::assertSame(0, $emptyThreadSummaries['summary']['bookings'] ?? null);
        self::assertSame(0, $emptyThreadSummaries['summary']['unread'] ?? null);

        $threadSummariesClamped = $this->requestJson('GET', '/api/messages/thread-summaries?view=all&limit=1&page=99', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame($threadSummariesClamped['total_pages'] ?? null, $threadSummariesClamped['page'] ?? null);
        self::assertGreaterThanOrEqual(1, (int) ($threadSummariesClamped['total_pages'] ?? 0));
        self::assertNotEmpty($threadSummariesClamped['items'] ?? []);
    }

    private function seedNotification(int $userId, string $title, string $message, string $category, bool $isRead): void
    {
        $this->db->executeStatement(
            <<<'SQL'
INSERT INTO notification (user_id, title, message, category, is_read, created_at)
VALUES (:user_id, :title, :message, :category, :is_read, NOW())
SQL,
            [
                'user_id' => $userId,
                'title' => $title,
                'message' => $message,
                'category' => $category,
                'is_read' => $isRead ? 1 : 0,
            ]
        );
    }
}
