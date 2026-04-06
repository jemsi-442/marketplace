<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

final class DeliveryAttachmentCleanupFlowTest extends ApiTestCase
{
    public function testAdminCanDeleteDeliveryAttachmentAndStoredFile(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("cleanup_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("cleanup_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("cleanup_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Cleanup Fixture Vendor');
        $this->promoteUserToAdmin($adminRegistration['user']['email']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need attachment cleanup coverage for stored delivery files.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $this->requestJson('PUT', sprintf('/api/bookings/%d', $bookingId), [
            'status' => 'confirmed',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $filePath = tempnam(sys_get_temp_dir(), 'cleanup-file-');
        self::assertNotFalse($filePath);
        file_put_contents($filePath, 'cleanup fixture attachment');

        $deliveryResponse = $this->requestMultipart('POST', sprintf('/api/bookings/%d/deliveries', $bookingId), [
            'delivery_note' => 'Cleanup delivery package is ready and includes one stored attachment.',
        ], [
            'files' => [
                new UploadedFile($filePath, 'cleanup-note.txt', 'text/plain', null, true),
            ],
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $deliveryId = (int) ($deliveryResponse['delivery']['id'] ?? 0);
        $attachmentId = (int) ($deliveryResponse['delivery']['attachments'][0]['id'] ?? 0);
        $storageUrl = $deliveryResponse['delivery']['attachments'][0]['file_url'] ?? null;
        self::assertIsString($storageUrl);
        self::assertStringStartsWith(
            sprintf('/api/bookings/%d/deliveries/%d/attachments/%d/download', $bookingId, $deliveryId, $attachmentId),
            $storageUrl
        );

        $storagePath = $this->db->fetchOne(
            'SELECT storage_path FROM delivery_attachment WHERE id = :id',
            ['id' => $attachmentId]
        );
        self::assertIsString($storagePath);
        $absolutePath = '/home/jaykali/marketplace/backend/var/uploads/deliveries/' . ltrim($storagePath, '/');
        self::assertFileExists($absolutePath);

        $deleteResponse = $this->requestJson(
            'DELETE',
            sprintf('/api/bookings/%d/deliveries/%d/attachments/%d', $bookingId, $deliveryId, $attachmentId),
            null,
            $adminLogin['token']
        );
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame('Delivery attachment deleted successfully', $deleteResponse['message'] ?? null);
        self::assertSame($attachmentId, $deleteResponse['deleted_attachment_id'] ?? null);
        self::assertCount(0, $deleteResponse['delivery']['attachments'] ?? []);

        self::assertFileDoesNotExist($absolutePath);
    }

    public function testAdminCanDeleteDeliverySubmissionAndStoredAttachmentFiles(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("cleanup_full_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("cleanup_full_vendor_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("cleanup_full_admin_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Cleanup Full Fixture Vendor');
        $this->promoteUserToAdmin($adminRegistration['user']['email']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $bookingFixture = $this->seedPlatformManagedBooking(
            (int) $clientRegistration['user']['id'],
            (int) $vendorRegistration['user']['id'],
            'Need cleanup route coverage for deleting a full delivery submission.'
        );
        $bookingId = $bookingFixture['booking_id'];

        $this->requestJson('PUT', sprintf('/api/bookings/%d', $bookingId), [
            'status' => 'confirmed',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $filePath = tempnam(sys_get_temp_dir(), 'cleanup-delivery-');
        self::assertNotFalse($filePath);
        file_put_contents($filePath, 'full delivery cleanup fixture attachment');

        $deliveryResponse = $this->requestMultipart('POST', sprintf('/api/bookings/%d/deliveries', $bookingId), [
            'delivery_note' => 'Cleanup delivery package is ready and will be removed by the admin route.',
        ], [
            'files' => [
                new UploadedFile($filePath, 'cleanup-delivery-note.txt', 'text/plain', null, true),
            ],
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $deliveryId = (int) ($deliveryResponse['delivery']['id'] ?? 0);
        $attachmentId = (int) ($deliveryResponse['delivery']['attachments'][0]['id'] ?? 0);
        $storageUrl = $deliveryResponse['delivery']['attachments'][0]['file_url'] ?? null;
        self::assertIsString($storageUrl);
        self::assertStringStartsWith(
            sprintf('/api/bookings/%d/deliveries/%d/attachments/%d/download', $bookingId, $deliveryId, $attachmentId),
            $storageUrl
        );

        $storagePath = $this->db->fetchOne(
            'SELECT storage_path FROM delivery_attachment WHERE id = :id',
            ['id' => $attachmentId]
        );
        self::assertIsString($storagePath);
        $absolutePath = '/home/jaykali/marketplace/backend/var/uploads/deliveries/' . ltrim($storagePath, '/');
        self::assertFileExists($absolutePath);

        $deleteResponse = $this->requestJson(
            'DELETE',
            sprintf('/api/bookings/%d/deliveries/%d', $bookingId, $deliveryId),
            null,
            $adminLogin['token']
        );
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame('Delivery submission deleted successfully', $deleteResponse['message'] ?? null);
        self::assertSame($deliveryId, $deleteResponse['deleted_delivery_id'] ?? null);
        self::assertSame('confirmed', $deleteResponse['booking_status'] ?? null);
        self::assertSame(0, $deleteResponse['deliveries_remaining'] ?? null);

        self::assertFileDoesNotExist($absolutePath);
    }
}
