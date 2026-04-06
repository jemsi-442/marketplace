<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

final class DeliveryLifecycleFlowTest extends ApiTestCase
{
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
}
