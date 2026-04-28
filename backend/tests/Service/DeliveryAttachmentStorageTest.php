<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\DeliveryAttachmentStorage;
use App\Service\S3CompatibleObjectStorage;
use App\Service\UploadedFileSecurityInspector;
use App\Service\UploadMalwareScanner;
use PHPUnit\Framework\TestCase;

final class DeliveryAttachmentStorageTest extends TestCase
{
    public function testPrepareRemoteUploadForBookingBuildsSignedUploadPayload(): void
    {
        $storage = new DeliveryAttachmentStorage(
            sys_get_temp_dir() . '/delivery-attachments',
            sys_get_temp_dir() . '/legacy-delivery-attachments',
            new S3CompatibleObjectStorage(
                'minio',
                'marketplace-assets',
                'us-east-1',
                'https://minio.example.test/storage',
                'access-key',
                'secret-key',
                true,
            ),
            new UploadedFileSecurityInspector(),
            new UploadMalwareScanner(false, 'clamscan', 20, true),
        );

        $prepared = $storage->prepareRemoteUploadForBooking('handoff.zip', 'application/zip', 55);

        self::assertIsArray($prepared);
        self::assertSame('handoff.zip', $prepared['file_name']);
        self::assertSame('application/zip', $prepared['mime_type']);
        self::assertStringStartsWith('booking-55/', $prepared['storage_path']);
        self::assertSame('PUT', $prepared['upload']['method']);
        self::assertStringContainsString('/marketplace-assets/booking-55/', $prepared['upload']['url']);
        self::assertSame('application/zip', $prepared['upload']['headers']['Content-Type'] ?? null);
    }
}
