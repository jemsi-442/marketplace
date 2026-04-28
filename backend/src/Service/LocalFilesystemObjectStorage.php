<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class LocalFilesystemObjectStorage implements ObjectStorageInterface
{
    public function storeUploadedFile(UploadedFile $file, string $rootDir, string $objectPrefix, string $storedName): string
    {
        $targetDir = rtrim($rootDir, '/') . '/' . trim($objectPrefix, '/');
        if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
            throw new \RuntimeException('Could not prepare upload directory.');
        }

        $file->move($targetDir, $storedName);

        return trim($objectPrefix, '/') . '/' . $storedName;
    }

    public function createTemporaryUploadLink(string $objectPrefix, string $storedName, ?string $contentType = null, int $ttlSeconds = 300): ?array
    {
        return null;
    }

    public function createTemporaryDownloadLink(?string $storagePath, int $ttlSeconds = 300): ?array
    {
        return null;
    }

    /**
     * @param list<string> $rootDirs
     */
    public function resolveStoredPath(?string $storagePath, array $rootDirs): ?string
    {
        if ($storagePath === null || trim($storagePath) === '') {
            return null;
        }

        $normalizedPath = ltrim(trim($storagePath), '/');

        foreach ($rootDirs as $rootDir) {
            $root = rtrim($rootDir, '/');
            $candidate = $root . '/' . $normalizedPath;
            $resolvedRoot = realpath($root) ?: $root;
            $resolvedCandidate = realpath($candidate);

            if ($resolvedCandidate === false || !is_file($resolvedCandidate)) {
                continue;
            }

            if ($resolvedCandidate === $resolvedRoot || str_starts_with($resolvedCandidate, $resolvedRoot . DIRECTORY_SEPARATOR)) {
                return $resolvedCandidate;
            }
        }

        return null;
    }

    /**
     * @param list<string> $rootDirs
     */
    public function removeStoredPath(?string $storagePath, array $rootDirs, ?string $cleanupRootDir = null): void
    {
        $absolutePath = $this->resolveStoredPath($storagePath, $rootDirs);
        if ($absolutePath === null) {
            return;
        }

        if (is_file($absolutePath)) {
            @unlink($absolutePath);
        }

        $cleanupRoot = $cleanupRootDir !== null
            ? (realpath($cleanupRootDir) ?: rtrim($cleanupRootDir, '/'))
            : dirname($absolutePath);
        $directory = dirname($absolutePath);

        while (is_dir($directory) && str_starts_with($directory, $cleanupRoot) && $directory !== $cleanupRoot) {
            $contents = scandir($directory);
            if ($contents === false || count($contents) > 2) {
                break;
            }

            @rmdir($directory);
            $directory = dirname($directory);
        }
    }
}
