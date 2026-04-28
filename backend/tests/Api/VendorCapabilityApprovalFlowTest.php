<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Symfony\Component\HttpFoundation\Response;

final class VendorCapabilityApprovalFlowTest extends ApiTestCase
{
    public function testAdminCanApprovePendingCapabilityBeforeItEntersVendorFeed(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("cap_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("cap_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("cap_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->promoteUserToAdmin($adminRegistration['user']['email']);
        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Capability Fixture Vendor');
        $this->markVendorVerified((int) $vendorRegistration['user']['id']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $serviceTypeId = $this->firstServiceTypeId();

        $capabilitySave = $this->requestJson('PUT', '/api/vendor/service-capabilities', [
            'capabilities' => [[
                'service_type_id' => $serviceTypeId,
                'is_active' => true,
                'experience_level' => 'senior',
                'starting_price_minor' => 240000,
                'capacity_status' => 'available',
                'turnaround_note' => '4 working days',
                'portfolio_summary' => 'Strong delivery experience',
            ]],
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertFalse($capabilitySave['capabilities'][0]['approved_by_admin'] ?? true);
        self::assertSame('pending', $capabilitySave['capabilities'][0]['review_state'] ?? null);

        $clientRequest = $this->requestJson('POST', '/api/client-requests', [
            'service_type_id' => $serviceTypeId,
            'request_summary' => 'Capability approval gate request',
            'scope_details' => 'This request should stay out of the vendor feed until approval.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $vendorFeedBeforeApproval = $this->requestJson('GET', '/api/vendor/request-feed?view=needs_proposal&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(0, $vendorFeedBeforeApproval['total_items'] ?? null);

        $adminCapabilityList = $this->requestJson('GET', '/api/admin/vendor-capabilities?view=pending&search=capability fixture&limit=10&page=1', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $adminCapabilityList['total_items'] ?? null);
        self::assertSame(1, $adminCapabilityList['summary']['pending'] ?? null);

        $summaryBeforeApproval = $this->requestJson('GET', '/api/admin/vendor-capabilities/summary?search=capability fixture', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $summaryBeforeApproval['total'] ?? null);
        self::assertSame(1, $summaryBeforeApproval['pending'] ?? null);
        self::assertSame(0, $summaryBeforeApproval['approved'] ?? null);

        $capabilityId = (int) ($adminCapabilityList['items'][0]['id'] ?? 0);
        self::assertGreaterThan(0, $capabilityId);

        $reviewResponse = $this->requestJson('POST', sprintf('/api/admin/vendor-capabilities/%d/review', $capabilityId), [
            'decision' => 'approve',
            'review_note' => 'Approved for matching.',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertTrue($reviewResponse['capability']['approved_by_admin'] ?? false);
        self::assertSame('approved', $reviewResponse['capability']['review_state'] ?? null);
        self::assertSame((int) $adminRegistration['user']['id'], $reviewResponse['capability']['reviewed_by_admin']['id'] ?? null);
        self::assertSame($adminRegistration['user']['email'], $reviewResponse['capability']['reviewed_by_admin']['email'] ?? null);

        $vendorCapabilitiesAfterApproval = $this->requestJson('GET', '/api/vendor/service-capabilities', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertTrue($vendorCapabilitiesAfterApproval['capabilities'][0]['approved_by_admin'] ?? false);
        self::assertSame((int) $adminRegistration['user']['id'], $vendorCapabilitiesAfterApproval['capabilities'][0]['reviewed_by_admin']['id'] ?? null);

        $summaryAfterApproval = $this->requestJson('GET', '/api/admin/vendor-capabilities/summary?search=capability fixture', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $summaryAfterApproval['total'] ?? null);
        self::assertSame(0, $summaryAfterApproval['pending'] ?? null);
        self::assertSame(1, $summaryAfterApproval['approved'] ?? null);

        $vendorFeedAfterApproval = $this->requestJson('GET', '/api/vendor/request-feed?view=needs_proposal&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $vendorFeedAfterApproval['total_items'] ?? null);
        self::assertSame('Capability approval gate request', $vendorFeedAfterApproval['items'][0]['request_summary'] ?? null);
    }

    public function testEditingApprovedCapabilityReturnsItToPendingReviewAndRemovesFeedAccess(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("cap_edit_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("cap_edit_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("cap_edit_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->promoteUserToAdmin($adminRegistration['user']['email']);
        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Editable Capability Vendor');
        $this->markVendorVerified((int) $vendorRegistration['user']['id']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $serviceTypeId = $this->firstServiceTypeId();

        $this->requestJson('PUT', '/api/vendor/service-capabilities', [
            'capabilities' => [[
                'service_type_id' => $serviceTypeId,
                'is_active' => true,
                'experience_level' => 'standard',
                'starting_price_minor' => 180000,
                'capacity_status' => 'available',
                'turnaround_note' => '3 working days',
                'portfolio_summary' => 'Initial capability version',
            ]],
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $pendingList = $this->requestJson('GET', '/api/admin/vendor-capabilities?view=pending&limit=10&page=1', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        $capabilityId = (int) ($pendingList['items'][0]['id'] ?? 0);
        self::assertGreaterThan(0, $capabilityId);

        $this->requestJson('POST', sprintf('/api/admin/vendor-capabilities/%d/review', $capabilityId), [
            'decision' => 'approve',
            'review_note' => 'Approved for matching.',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $this->requestJson('POST', '/api/client-requests', [
            'service_type_id' => $serviceTypeId,
            'request_summary' => 'Capability edit re-review request',
            'scope_details' => 'This request should disappear after a material capability edit.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $feedBeforeEdit = $this->requestJson('GET', '/api/vendor/request-feed?view=needs_proposal&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $feedBeforeEdit['total_items'] ?? null);

        $editCapability = $this->requestJson('PUT', '/api/vendor/service-capabilities', [
            'capabilities' => [[
                'service_type_id' => $serviceTypeId,
                'is_active' => true,
                'experience_level' => 'expert',
                'starting_price_minor' => 260000,
                'capacity_status' => 'limited',
                'turnaround_note' => '6 working days',
                'portfolio_summary' => 'Updated capability version requiring a fresh admin review',
            ]],
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertFalse($editCapability['capabilities'][0]['approved_by_admin'] ?? true);
        self::assertSame('pending', $editCapability['capabilities'][0]['review_state'] ?? null);
        self::assertNull($editCapability['capabilities'][0]['reviewed_at'] ?? null);
        self::assertNull($editCapability['capabilities'][0]['admin_review_note'] ?? null);
        self::assertNull($editCapability['capabilities'][0]['reviewed_by_admin'] ?? null);

        $feedAfterEdit = $this->requestJson('GET', '/api/vendor/request-feed?view=needs_proposal&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(0, $feedAfterEdit['total_items'] ?? null);

        $pendingAgain = $this->requestJson('GET', '/api/admin/vendor-capabilities?view=pending&limit=10&page=1', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertGreaterThanOrEqual(1, (int) ($pendingAgain['summary']['pending'] ?? 0));

        $summaryAfterEdit = $this->requestJson('GET', '/api/admin/vendor-capabilities/summary', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertGreaterThanOrEqual(1, (int) ($summaryAfterEdit['pending'] ?? 0));
    }

    public function testVendorCanDisableAllCapabilitiesAndLoseFeedAccess(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("cap_disable_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("cap_disable_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("cap_disable_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->promoteUserToAdmin($adminRegistration['user']['email']);
        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Disable Capability Vendor');
        $this->markVendorVerified((int) $vendorRegistration['user']['id']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $serviceTypeId = $this->firstServiceTypeId();

        $this->requestJson('PUT', '/api/vendor/service-capabilities', [
            'capabilities' => [[
                'service_type_id' => $serviceTypeId,
                'is_active' => true,
                'experience_level' => 'standard',
                'starting_price_minor' => 190000,
                'capacity_status' => 'available',
                'turnaround_note' => '5 working days',
                'portfolio_summary' => 'Capability that will be disabled later',
            ]],
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $pendingList = $this->requestJson('GET', '/api/admin/vendor-capabilities?view=pending&limit=10&page=1', null, $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        $capabilityId = (int) ($pendingList['items'][0]['id'] ?? 0);
        self::assertGreaterThan(0, $capabilityId);

        $this->requestJson('POST', sprintf('/api/admin/vendor-capabilities/%d/review', $capabilityId), [
            'decision' => 'approve',
            'review_note' => 'Approved before disable flow.',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $this->requestJson('POST', '/api/client-requests', [
            'service_type_id' => $serviceTypeId,
            'request_summary' => 'Capability disable flow request',
            'scope_details' => 'This request should disappear when the capability is removed.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $feedBeforeDisable = $this->requestJson('GET', '/api/vendor/request-feed?view=needs_proposal&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $feedBeforeDisable['total_items'] ?? null);

        $disableAll = $this->requestJson('PUT', '/api/vendor/service-capabilities', [
            'capabilities' => [],
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertNotEmpty($disableAll['capabilities'] ?? []);
        self::assertFalse($disableAll['capabilities'][0]['is_active'] ?? true);
        self::assertFalse($disableAll['capabilities'][0]['approved_by_admin'] ?? true);
        self::assertSame('pending', $disableAll['capabilities'][0]['review_state'] ?? null);
        self::assertNull($disableAll['capabilities'][0]['reviewed_by_admin'] ?? null);

        $feedAfterDisable = $this->requestJson('GET', '/api/vendor/request-feed?view=needs_proposal&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(0, $feedAfterDisable['total_items'] ?? null);
    }
}
