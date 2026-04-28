<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\S3CompatibleObjectStorage;
use App\Service\UploadedFileSecurityInspector;
use App\Service\UploadMalwareScanner;
use App\Service\VendorResumeStorage;
use PHPUnit\Framework\TestCase;

final class VendorResumeStorageTest extends TestCase
{
    public function testPrepareRemoteUploadForVendorBuildsSignedUploadPayload(): void
    {
        $storage = new VendorResumeStorage(
            sys_get_temp_dir() . '/vendor-resumes',
            new S3CompatibleObjectStorage(
                's3',
                'marketplace-assets',
                'eu-central-1',
                'https://s3.example.test',
                'access-key',
                'secret-key',
                true,
            ),
            new UploadedFileSecurityInspector(),
            new UploadMalwareScanner(false, 'clamscan', 20, true),
        );

        $prepared = $storage->prepareRemoteUploadForVendor('Candidate Resume.pdf', 'application/pdf', 12);

        self::assertIsArray($prepared);
        self::assertSame('Candidate Resume.pdf', $prepared['file_name']);
        self::assertSame('application/pdf', $prepared['mime_type']);
        self::assertStringStartsWith('vendor-12/', $prepared['storage_path']);
        self::assertSame('PUT', $prepared['upload']['method']);
        self::assertStringContainsString('X-Amz-Algorithm=AWS4-HMAC-SHA256', $prepared['upload']['url']);
        self::assertSame('application/pdf', $prepared['upload']['headers']['Content-Type'] ?? null);
    }
}
