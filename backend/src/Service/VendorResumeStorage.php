<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class VendorResumeStorage
{
    private const MAX_FILE_SIZE_BYTES = 8_000_000;

    /**
     * @var array<string, list<string>>
     */
    private const ALLOWED_MIME_TYPES = [
        'application/pdf' => ['pdf'],
        'application/msword' => ['doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => ['docx'],
        'text/plain' => ['txt'],
    ];

    public function __construct(
        private readonly string $uploadDir,
        private readonly ObjectStorageInterface $objectStorage,
        private readonly UploadedFileSecurityInspector $uploadedFileSecurityInspector,
        private readonly UploadMalwareScanner $uploadMalwareScanner,
    ) {
    }

    /**
     * @return array{file_name: string, storage_path: string, mime_type: string, size_bytes: int}
     */
    public function storeForVendor(UploadedFile $file, int $vendorProfileId): array
    {
        if (!$file->isValid()) {
            throw new \InvalidArgumentException('The uploaded resume is invalid.');
        }

        $size = $file->getSize() ?? 0;
        if ($size <= 0 || $size > self::MAX_FILE_SIZE_BYTES) {
            throw new \InvalidArgumentException('Resume files must be between 1 byte and 8 MB.');
        }

        $mimeType = $this->uploadedFileSecurityInspector->detectAllowedMimeType($file, self::ALLOWED_MIME_TYPES);
        if ($mimeType === null || !isset(self::ALLOWED_MIME_TYPES[$mimeType])) {
            throw new \InvalidArgumentException(sprintf('Unsupported resume file type: %s', $mimeType ?? 'unknown'));
        }

        $this->uploadMalwareScanner->assertSafe($file, 'Resume upload');

        $originalName = $file->getClientOriginalName() ?: 'resume';
        $safeName = $this->sanitizeFileName(pathinfo($originalName, PATHINFO_FILENAME));
        $extension = self::ALLOWED_MIME_TYPES[$mimeType][0] ?? 'bin';
        $storedName = sprintf('%s-%s.%s', $safeName, bin2hex(random_bytes(6)), $extension);
        $storagePath = $this->objectStorage->storeUploadedFile(
            $file,
            $this->uploadDir,
            'vendor-' . $vendorProfileId,
            $storedName
        );

        return [
            'file_name' => $originalName,
            'storage_path' => $storagePath,
            'mime_type' => $mimeType,
            'size_bytes' => $size,
        ];
    }

    public function assertSupportedMimeType(string $mimeType): void
    {
        $normalizedMime = trim($mimeType);
        if ($normalizedMime === '' || !isset(self::ALLOWED_MIME_TYPES[$normalizedMime])) {
            throw new \InvalidArgumentException(sprintf('Unsupported resume file type: %s', $normalizedMime !== '' ? $normalizedMime : 'unknown'));
        }
    }

    public function resolveStoredResumePath(?string $storagePath): ?string
    {
        return $this->objectStorage->resolveStoredPath($storagePath, [$this->uploadDir]);
    }

    /**
     * @return array{
     *   file_name: string,
     *   storage_path: string,
     *   mime_type: string,
     *   upload: array{
     *     url: string,
     *     method: string,
     *     headers: array<string, string>,
     *     expires: int,
     *     storage_path: string
     *   }
     * }|null
     */
    public function prepareRemoteUploadForVendor(string $originalName, string $mimeType, int $vendorProfileId): ?array
    {
        $normalizedMime = trim($mimeType);
        $this->assertSupportedMimeType($normalizedMime);

        $safeName = $this->sanitizeFileName(pathinfo($originalName !== '' ? $originalName : 'resume', PATHINFO_FILENAME));
        $extension = self::ALLOWED_MIME_TYPES[$normalizedMime][0] ?? 'bin';
        $storedName = sprintf('%s-%s.%s', $safeName, bin2hex(random_bytes(6)), $extension);
        $upload = $this->objectStorage->createTemporaryUploadLink(
            'vendor-' . $vendorProfileId,
            $storedName,
            $normalizedMime
        );

        if ($upload === null) {
            return null;
        }

        return [
            'file_name' => $originalName !== '' ? $originalName : 'resume',
            'storage_path' => $upload['storage_path'],
            'mime_type' => $normalizedMime,
            'upload' => $upload,
        ];
    }

    /**
     * @return array{mime_type: string, size_bytes: int}
     */
    public function validateStoredResumeObject(string $absolutePath, string $originalName): array
    {
        if (!is_file($absolutePath)) {
            throw new \InvalidArgumentException('Resume file was not found after upload.');
        }

        $size = filesize($absolutePath);
        $normalizedSize = is_int($size) ? $size : 0;
        if ($normalizedSize <= 0 || $normalizedSize > self::MAX_FILE_SIZE_BYTES) {
            throw new \InvalidArgumentException('Resume files must be between 1 byte and 8 MB.');
        }

        $file = new UploadedFile(
            $absolutePath,
            $originalName !== '' ? $originalName : 'resume',
            null,
            null,
            true
        );

        $mimeType = $this->uploadedFileSecurityInspector->detectAllowedMimeType($file, self::ALLOWED_MIME_TYPES);
        if ($mimeType === null || !isset(self::ALLOWED_MIME_TYPES[$mimeType])) {
            throw new \InvalidArgumentException(sprintf('Unsupported resume file type: %s', $mimeType ?? 'unknown'));
        }

        $this->uploadMalwareScanner->assertSafe($file, 'Resume upload');

        return [
            'mime_type' => $mimeType,
            'size_bytes' => $normalizedSize,
        ];
    }

    /**
     * @return array{url: string, expires: int}|null
     */
    public function createTemporaryDownloadLink(?string $storagePath, int $ttlSeconds = 300): ?array
    {
        return $this->objectStorage->createTemporaryDownloadLink($storagePath, $ttlSeconds);
    }

    public function removeStoredResume(?string $storagePath): void
    {
        $this->objectStorage->removeStoredPath($storagePath, [$this->uploadDir], $this->uploadDir);
    }

    private function sanitizeFileName(string $name): string
    {
        $clean = preg_replace('/[^A-Za-z0-9._-]+/', '-', trim($name)) ?: 'resume';
        $clean = trim($clean, '-._');

        return $clean !== '' ? strtolower($clean) : 'resume';
    }
}
