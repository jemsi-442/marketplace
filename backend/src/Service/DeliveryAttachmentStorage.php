<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class DeliveryAttachmentStorage
{
    private const MAX_FILE_SIZE_BYTES = 15_000_000;

    /**
     * @var array<string, list<string>>
     */
    private const ALLOWED_MIME_TYPES = [
        'application/pdf' => ['pdf'],
        'application/zip' => ['zip'],
        'application/x-zip-compressed' => ['zip'],
        'application/msword' => ['doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => ['docx'],
        'application/vnd.ms-excel' => ['xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => ['xlsx'],
        'application/vnd.ms-powerpoint' => ['ppt'],
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => ['pptx'],
        'image/jpeg' => ['jpg', 'jpeg'],
        'image/png' => ['png'],
        'image/webp' => ['webp'],
        'text/plain' => ['txt'],
        'text/csv' => ['csv'],
        'application/json' => ['json'],
    ];

    public function __construct(
        private readonly string $uploadDir,
        private readonly string $legacyPublicUploadDir,
        private readonly ObjectStorageInterface $objectStorage,
        private readonly UploadedFileSecurityInspector $uploadedFileSecurityInspector,
        private readonly UploadMalwareScanner $uploadMalwareScanner,
    ) {
    }

    /**
     * @return array{file_name: string, storage_path: string, mime_type: string, size_bytes: int}
     */
    public function storeForBooking(UploadedFile $file, int $bookingId): array
    {
        if (!$file->isValid()) {
            throw new \InvalidArgumentException('One of the uploaded files is invalid.');
        }

        $size = $file->getSize() ?? 0;
        if ($size <= 0 || $size > self::MAX_FILE_SIZE_BYTES) {
            throw new \InvalidArgumentException('Each delivery file must be between 1 byte and 15 MB.');
        }

        $mimeType = $this->uploadedFileSecurityInspector->detectAllowedMimeType($file, self::ALLOWED_MIME_TYPES);
        if ($mimeType === null || !array_key_exists($mimeType, self::ALLOWED_MIME_TYPES)) {
            throw new \InvalidArgumentException(sprintf('Unsupported delivery file type: %s', $mimeType ?? 'unknown'));
        }

        $this->uploadMalwareScanner->assertSafe($file, 'Delivery file');

        $originalName = $file->getClientOriginalName() ?: 'delivery-file';
        $safeName = $this->sanitizeFileName(pathinfo($originalName, PATHINFO_FILENAME));
        $extension = self::ALLOWED_MIME_TYPES[$mimeType][0] ?? 'bin';
        $storedName = sprintf('%s-%s.%s', $safeName, bin2hex(random_bytes(6)), $extension);
        $storagePath = $this->objectStorage->storeUploadedFile(
            $file,
            $this->uploadDir,
            'booking-' . $bookingId,
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
        if ($normalizedMime === '' || !array_key_exists($normalizedMime, self::ALLOWED_MIME_TYPES)) {
            throw new \InvalidArgumentException(sprintf('Unsupported delivery file type: %s', $normalizedMime !== '' ? $normalizedMime : 'unknown'));
        }
    }

    public function resolveStoredAttachmentPath(?string $storagePath): ?string
    {
        return $this->objectStorage->resolveStoredPath($storagePath, [$this->uploadDir, $this->legacyPublicUploadDir]);
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
    public function prepareRemoteUploadForBooking(string $originalName, string $mimeType, int $bookingId): ?array
    {
        $normalizedMime = trim($mimeType);
        $this->assertSupportedMimeType($normalizedMime);

        $safeName = $this->sanitizeFileName(pathinfo($originalName !== '' ? $originalName : 'delivery-file', PATHINFO_FILENAME));
        $extension = self::ALLOWED_MIME_TYPES[$normalizedMime][0] ?? 'bin';
        $storedName = sprintf('%s-%s.%s', $safeName, bin2hex(random_bytes(6)), $extension);
        $upload = $this->objectStorage->createTemporaryUploadLink(
            'booking-' . $bookingId,
            $storedName,
            $normalizedMime
        );

        if ($upload === null) {
            return null;
        }

        return [
            'file_name' => $originalName !== '' ? $originalName : 'delivery-file',
            'storage_path' => $upload['storage_path'],
            'mime_type' => $normalizedMime,
            'upload' => $upload,
        ];
    }

    /**
     * @return array{mime_type: string, size_bytes: int}
     */
    public function validateStoredAttachmentObject(string $absolutePath, string $originalName): array
    {
        if (!is_file($absolutePath)) {
            throw new \InvalidArgumentException('Stored delivery file was not found after upload.');
        }

        $size = filesize($absolutePath);
        $normalizedSize = is_int($size) ? $size : 0;
        if ($normalizedSize <= 0 || $normalizedSize > self::MAX_FILE_SIZE_BYTES) {
            throw new \InvalidArgumentException('Each delivery file must be between 1 byte and 15 MB.');
        }

        $file = new UploadedFile(
            $absolutePath,
            $originalName !== '' ? $originalName : 'delivery-file',
            null,
            null,
            true
        );

        $mimeType = $this->uploadedFileSecurityInspector->detectAllowedMimeType($file, self::ALLOWED_MIME_TYPES);
        if ($mimeType === null || !array_key_exists($mimeType, self::ALLOWED_MIME_TYPES)) {
            throw new \InvalidArgumentException(sprintf('Unsupported delivery file type: %s', $mimeType ?? 'unknown'));
        }

        $this->uploadMalwareScanner->assertSafe($file, 'Delivery file');

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

    public function removeStoredAttachment(?string $storagePath): void
    {
        $this->objectStorage->removeStoredPath($storagePath, [$this->uploadDir, $this->legacyPublicUploadDir], $this->uploadDir);
    }

    private function sanitizeFileName(string $name): string
    {
        $clean = preg_replace('/[^A-Za-z0-9._-]+/', '-', trim($name)) ?: 'delivery-file';
        $clean = trim($clean, '-._');

        return $clean !== '' ? strtolower($clean) : 'delivery-file';
    }
}
