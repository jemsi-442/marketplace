<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class ConfigurableObjectStorage implements ObjectStorageInterface
{
    public function __construct(
        private readonly string $driver,
        private readonly LocalFilesystemObjectStorage $localFilesystemObjectStorage,
        private readonly S3CompatibleObjectStorage $s3CompatibleObjectStorage,
    ) {
    }

    public function storeUploadedFile(UploadedFile $file, string $rootDir, string $objectPrefix, string $storedName): string
    {
        return match ($this->driver) {
            'local' => $this->localFilesystemObjectStorage->storeUploadedFile($file, $rootDir, $objectPrefix, $storedName),
            's3', 'minio' => $this->s3CompatibleObjectStorage->storeUploadedFile($file, $rootDir, $objectPrefix, $storedName),
            default => throw new \RuntimeException(sprintf(
                'Object storage driver "%s" is not supported by the current build.',
                $this->driver
            )),
        };
    }

    public function createTemporaryUploadLink(string $objectPrefix, string $storedName, ?string $contentType = null, int $ttlSeconds = 300): ?array
    {
        return match ($this->driver) {
            'local' => $this->localFilesystemObjectStorage->createTemporaryUploadLink($objectPrefix, $storedName, $contentType, $ttlSeconds),
            's3', 'minio' => $this->s3CompatibleObjectStorage->createTemporaryUploadLink($objectPrefix, $storedName, $contentType, $ttlSeconds),
            default => null,
        };
    }

    public function createTemporaryDownloadLink(?string $storagePath, int $ttlSeconds = 300): ?array
    {
        return match ($this->driver) {
            'local' => $this->localFilesystemObjectStorage->createTemporaryDownloadLink($storagePath, $ttlSeconds),
            's3', 'minio' => $this->s3CompatibleObjectStorage->createTemporaryDownloadLink($storagePath, $ttlSeconds),
            default => null,
        };
    }

    public function resolveStoredPath(?string $storagePath, array $rootDirs): ?string
    {
        return match ($this->driver) {
            'local' => $this->localFilesystemObjectStorage->resolveStoredPath($storagePath, $rootDirs),
            's3', 'minio' => $this->s3CompatibleObjectStorage->resolveStoredPath($storagePath, $rootDirs),
            default => null,
        };
    }

    public function removeStoredPath(?string $storagePath, array $rootDirs, ?string $cleanupRootDir = null): void
    {
        match ($this->driver) {
            'local' => $this->localFilesystemObjectStorage->removeStoredPath($storagePath, $rootDirs, $cleanupRootDir),
            's3', 'minio' => $this->s3CompatibleObjectStorage->removeStoredPath($storagePath, $rootDirs, $cleanupRootDir),
            default => null,
        };
    }
}
