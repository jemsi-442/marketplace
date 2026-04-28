<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

interface ObjectStorageInterface
{
    public function storeUploadedFile(UploadedFile $file, string $rootDir, string $objectPrefix, string $storedName): string;

    /**
     * @return array{
     *   url: string,
     *   method: string,
     *   headers: array<string, string>,
     *   expires: int,
     *   storage_path: string
     * }|null
     */
    public function createTemporaryUploadLink(string $objectPrefix, string $storedName, ?string $contentType = null, int $ttlSeconds = 300): ?array;

    /**
     * @return array{url: string, expires: int}|null
     */
    public function createTemporaryDownloadLink(?string $storagePath, int $ttlSeconds = 300): ?array;

    /**
     * @param list<string> $rootDirs
     */
    public function resolveStoredPath(?string $storagePath, array $rootDirs): ?string;

    /**
     * @param list<string> $rootDirs
     */
    public function removeStoredPath(?string $storagePath, array $rootDirs, ?string $cleanupRootDir = null): void;
}
