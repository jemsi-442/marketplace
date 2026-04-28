<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

final class DeliveryLifecycleFlowTest extends ApiTestCase
{
    public function testDirectDeliveryUploadPrepareIsUnavailableOnLocalDriver(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("delivery_direct_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("delivery_direct_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("delivery_direct_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Delivery Direct Upload Fixture Vendor');
        $this->promoteUserToAdmin($adminRegistration['user']['email']);

        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need direct delivery upload prepare coverage.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $this->requestJson('PUT', sprintf('/api/bookings/%d', $bookingId), [
            'status' => 'confirmed',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $response = $this->requestJson('POST', sprintf('/api/bookings/%d/deliveries/direct-upload/prepare', $bookingId), [
            'files' => [
                [
                    'file_name' => 'handoff.pdf',
                    'mime_type' => 'application/pdf',
                ],
            ],
        ], $vendorLogin['token']);

        self::assertResponseStatusCodeSame(Response::HTTP_CONFLICT);
        self::assertStringContainsString('Direct delivery upload is not available', (string) ($response['error'] ?? ''));
    }

    public function testClientCanDownloadDeliveryAttachmentWithExplicitMimeType(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("delivery_download_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("delivery_download_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("delivery_download_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Delivery Download Fixture Vendor');
        $this->promoteUserToAdmin($adminRegistration['user']['email']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need attachment download regression coverage.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $this->requestJson('PUT', sprintf('/api/bookings/%d', $bookingId), [
            'status' => 'confirmed',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $pdfPath = tempnam(sys_get_temp_dir(), 'delivery-download-pdf-');
        self::assertNotFalse($pdfPath);
        file_put_contents($pdfPath, '%PDF-1.4 download fixture');

        $delivery = $this->requestMultipart('POST', sprintf('/api/bookings/%d/deliveries', $bookingId), [
            'delivery_note' => 'Attachment download route should return a stable content type.',
        ], [
            'files' => [
                new UploadedFile($pdfPath, 'download-proof.pdf', 'application/pdf', null, true),
            ],
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $deliveryId = (int) ($delivery['delivery']['id'] ?? 0);
        $attachmentId = (int) (($delivery['delivery']['attachments'][0]['id'] ?? 0));
        $downloadUrl = (string) (($delivery['delivery']['attachments'][0]['file_url'] ?? ''));
        self::assertGreaterThan(0, $deliveryId);
        self::assertGreaterThan(0, $attachmentId);
        self::assertStringContainsString(
            sprintf('/api/bookings/%d/deliveries/%d/attachments/%d/download', $bookingId, $deliveryId, $attachmentId),
            $downloadUrl
        );

        $this->applyCookieToken($clientLogin['token']);
        $this->client->request('GET', $downloadUrl);

        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame('application/pdf', $this->client->getResponse()->headers->get('Content-Type'));
        self::assertStringContainsString(
            'attachment; filename=download-proof.pdf',
            (string) $this->client->getResponse()->headers->get('Content-Disposition')
        );
    }

    public function testVendorCanSubmitDeliveryClientCanRequestChangesAndApprove(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("delivery_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("delivery_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("delivery_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Delivery Fixture Vendor');
        $this->promoteUserToAdmin($adminRegistration['user']['email']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need a full delivery and revision workflow test.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $this->requestJson('PUT', sprintf('/api/bookings/%d', $bookingId), [
            'status' => 'confirmed',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $pdfPath = tempnam(sys_get_temp_dir(), 'delivery-pdf-');
        $pngPath = tempnam(sys_get_temp_dir(), 'delivery-png-');
        self::assertNotFalse($pdfPath);
        self::assertNotFalse($pngPath);
        file_put_contents($pdfPath, '%PDF-1.4 delivery fixture');
        file_put_contents($pngPath, "\x89PNG\r\n\x1a\nfixture");

        $firstDelivery = $this->requestMultipart('POST', sprintf('/api/bookings/%d/deliveries', $bookingId), [
            'delivery_note' => 'Initial delivery package is ready for review and testing.',
            'delivery_link' => 'https://example.test/demo-one',
        ], [
            'files' => [
                new UploadedFile($pdfPath, 'handover-brief.pdf', 'application/pdf', null, true),
                new UploadedFile($pngPath, 'demo-screenshot.png', 'image/png', null, true),
            ],
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $firstDeliveryId = (int) ($firstDelivery['delivery']['id'] ?? 0);
        self::assertGreaterThan(0, $firstDeliveryId);
        self::assertSame('submitted', $firstDelivery['delivery']['status'] ?? null);
        self::assertCount(2, $firstDelivery['delivery']['attachments'] ?? []);
        self::assertStringStartsWith(
            sprintf('/api/bookings/%d/deliveries/%d/attachments/', $bookingId, $firstDeliveryId),
            $firstDelivery['delivery']['attachments'][0]['file_url'] ?? ''
        );
        self::assertStringContainsString(
            'signature=',
            (string) ($firstDelivery['delivery']['attachments'][0]['file_url'] ?? '')
        );

        $changeRequest = $this->requestJson('POST', sprintf('/api/bookings/%d/deliveries/%d/request-changes', $bookingId, $firstDeliveryId), [
            'review_note' => 'Please revise the demo copy and update the finishing details.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame('changes_requested', $changeRequest['delivery']['status'] ?? null);

        $secondDelivery = $this->requestJson('POST', sprintf('/api/bookings/%d/deliveries', $bookingId), [
            'delivery_note' => 'Revised delivery package is ready with the requested updates included.',
            'delivery_link' => 'https://example.test/demo-two',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $secondDeliveryId = (int) ($secondDelivery['delivery']['id'] ?? 0);
        self::assertGreaterThan(0, $secondDeliveryId);

        $approval = $this->requestJson('POST', sprintf('/api/bookings/%d/deliveries/%d/approve', $bookingId, $secondDeliveryId), [
            'review_note' => 'Approved for release and final wrap-up.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame('approved', $approval['delivery']['status'] ?? null);
        self::assertSame('completed', $approval['booking_status'] ?? null);

        $deliveries = $this->requestJson('GET', sprintf('/api/bookings/%d/deliveries', $bookingId), null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertCount(2, $deliveries['deliveries'] ?? []);
        $listedFirstDelivery = null;
        foreach (($deliveries['deliveries'] ?? []) as $delivery) {
            if (($delivery['id'] ?? null) === $firstDeliveryId) {
                $listedFirstDelivery = $delivery;
                break;
            }
        }
        self::assertIsArray($listedFirstDelivery);
        self::assertCount(2, $listedFirstDelivery['attachments'] ?? []);

        $review = $this->requestJson('POST', '/api/reviews', [
            'bookingId' => $bookingId,
            'rating' => 5,
            'comment' => 'Delivery flow completed successfully.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
    }

    public function testDeliveryRejectsShellRenamedAsPdf(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("delivery_shell_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("delivery_shell_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("delivery_shell_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Delivery Shell Fixture Vendor');
        $this->promoteUserToAdmin($adminRegistration['user']['email']);

        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need delivery shell upload rejection coverage.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $this->requestJson('PUT', sprintf('/api/bookings/%d', $bookingId), [
            'status' => 'confirmed',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $shellPath = tempnam(sys_get_temp_dir(), 'delivery-shell-');
        self::assertNotFalse($shellPath);
        file_put_contents($shellPath, "<?php echo 'backdoor';");

        $response = $this->requestMultipart('POST', sprintf('/api/bookings/%d/deliveries', $bookingId), [
            'delivery_note' => 'Trying to upload a disguised shell file.',
        ], [
            'files' => [
                new UploadedFile($shellPath, 'invoice-proof.pdf', 'application/pdf', null, true),
            ],
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
        self::assertStringContainsString('Unsupported delivery file type', (string) ($response['error'] ?? ''));
    }

    public function testDeliveryUploadIsRateLimited(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("delivery_limit_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("delivery_limit_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("delivery_limit_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Delivery Limit Fixture Vendor');
        $this->promoteUserToAdmin($adminRegistration['user']['email']);

        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need delivery upload limiter coverage.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $this->requestJson('PUT', sprintf('/api/bookings/%d', $bookingId), [
            'status' => 'confirmed',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        for ($attempt = 1; $attempt <= 6; ++$attempt) {
            $pdfPath = tempnam(sys_get_temp_dir(), 'delivery-limit-');
            self::assertNotFalse($pdfPath);
            file_put_contents($pdfPath, '%PDF-1.4 delivery limiter fixture');

            $this->requestMultipart('POST', sprintf('/api/bookings/%d/deliveries', $bookingId), [
                'delivery_note' => sprintf('Delivery upload limiter attempt %d is ready for review.', $attempt),
            ], [
                'files' => [
                    new UploadedFile($pdfPath, sprintf('handover-%d.pdf', $attempt), 'application/pdf', null, true),
                ],
            ], $vendorLogin['token']);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        }

        $blockedPath = tempnam(sys_get_temp_dir(), 'delivery-limit-');
        self::assertNotFalse($blockedPath);
        file_put_contents($blockedPath, '%PDF-1.4 delivery limiter blocked');

        $blocked = $this->requestMultipart('POST', sprintf('/api/bookings/%d/deliveries', $bookingId), [
            'delivery_note' => 'Delivery upload limiter blocked attempt is ready for review.',
        ], [
            'files' => [
                new UploadedFile($blockedPath, 'handover-blocked.pdf', 'application/pdf', null, true),
            ],
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_TOO_MANY_REQUESTS);
        self::assertStringContainsString('Too many delivery uploads', (string) ($blocked['error'] ?? ''));
    }

    private function applyCookieToken(string $token): void
    {
        $this->client->getCookieJar()->clear();

        foreach (explode(';', $token) as $segment) {
            $segment = trim($segment);
            if ($segment === '') {
                continue;
            }

            [$name, $value] = array_pad(explode('=', $segment, 2), 2, '');
            $this->client->getCookieJar()->set(new \Symfony\Component\BrowserKit\Cookie($name, $value));
        }
    }
}
