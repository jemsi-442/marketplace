<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\S3CompatibleObjectStorage;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;

final class S3CompatibleObjectStorageTest extends TestCase
{
    public function testMissingConfigurationThrowsClearRuntimeException(): void
    {
        $storage = new S3CompatibleObjectStorage(
            's3',
            null,
            'eu-central-1',
            'https://s3.example.test',
            'access-key',
            'secret-key',
            true,
        );

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('missing required configuration: bucket');

        $storage->storeUploadedFile($this->createUploadedFile(), '/tmp/uploads', 'vendor-1', 'resume.txt');
    }

    public function testStoreUploadedFileUsesSignedPutRequestAndReturnsObjectKey(): void
    {
        $captured = null;
        $storage = new S3CompatibleObjectStorage(
            'minio',
            'marketplace-assets',
            'us-east-1',
            'https://minio.example.test/storage',
            'access-key',
            'secret-key',
            true,
            function (string $method, string $url, array $headers, ?string $body) use (&$captured): array {
                $captured = [
                    'method' => $method,
                    'url' => $url,
                    'headers' => $headers,
                    'body' => $body,
                ];

                return [
                    'status_code' => 200,
                    'body' => '',
                ];
            }
        );

        $key = $storage->storeUploadedFile($this->createUploadedFile(), '/tmp/uploads', 'vendor-42', 'resume.txt');

        self::assertSame('vendor-42/resume.txt', $key);
        self::assertIsArray($captured);
        self::assertSame('PUT', $captured['method']);
        self::assertSame('https://minio.example.test/storage/marketplace-assets/vendor-42/resume.txt', $captured['url']);
        self::assertArrayHasKey('authorization', $captured['headers']);
        self::assertArrayHasKey('x-amz-content-sha256', $captured['headers']);
        self::assertSame("hello\n", $captured['body']);
    }

    public function testResolveStoredPathDownloadsObjectIntoLocalCache(): void
    {
        $storage = new S3CompatibleObjectStorage(
            's3',
            'marketplace-assets',
            'eu-central-1',
            'https://s3.example.test',
            'access-key',
            'secret-key',
            true,
            static fn (string $method, string $url, array $headers, ?string $body): array => [
                'status_code' => 200,
                'body' => "resume-content\n",
            ]
        );

        $resolvedPath = $storage->resolveStoredPath('vendor-8/resume.txt', []);

        self::assertIsString($resolvedPath);
        self::assertFileExists($resolvedPath);
        self::assertSame("resume-content\n", file_get_contents($resolvedPath));

        @unlink($resolvedPath);
    }

    public function testCreateTemporaryDownloadLinkReturnsPresignedUrl(): void
    {
        $storage = new S3CompatibleObjectStorage(
            's3',
            'marketplace-assets',
            'eu-central-1',
            'https://s3.example.test',
            'access-key',
            'secret-key',
            true,
        );

        $link = $storage->createTemporaryDownloadLink('vendor-8/resume.txt', 180);

        self::assertIsArray($link);
        self::assertArrayHasKey('url', $link);
        self::assertArrayHasKey('expires', $link);
        self::assertStringContainsString('X-Amz-Algorithm=AWS4-HMAC-SHA256', $link['url']);
        self::assertStringContainsString('X-Amz-SignedHeaders=host', $link['url']);
        self::assertStringContainsString('/marketplace-assets/vendor-8/resume.txt', $link['url']);
        self::assertGreaterThan(time(), $link['expires']);
    }

    public function testRemoveStoredPathDeletesRemoteObjectAndCachedCopy(): void
    {
        $requests = [];
        $storage = new S3CompatibleObjectStorage(
            's3',
            'marketplace-assets',
            'eu-central-1',
            'https://s3.example.test',
            'access-key',
            'secret-key',
            true,
            function (string $method, string $url, array $headers, ?string $body) use (&$requests): array {
                $requests[] = [
                    'method' => $method,
                    'url' => $url,
                ];

                return [
                    'status_code' => $method === 'GET' ? 200 : 204,
                    'body' => $method === 'GET' ? 'cached-delivery' : '',
                ];
            }
        );

        $resolvedPath = $storage->resolveStoredPath('booking-5/proof.pdf', []);
        self::assertIsString($resolvedPath);
        self::assertFileExists($resolvedPath);

        $storage->removeStoredPath('booking-5/proof.pdf', []);

        self::assertFalse(is_file($resolvedPath));
        self::assertCount(2, $requests);
        self::assertSame('GET', $requests[0]['method']);
        self::assertSame('DELETE', $requests[1]['method']);
    }

    private function createUploadedFile(): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 's3-storage-test-');
        self::assertIsString($path);
        file_put_contents($path, "hello\n");

        return new UploadedFile($path, 'resume.txt', 'text/plain', null, true);
    }
}
