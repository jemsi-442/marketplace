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
        'image/jpeg' => ['jpg'],
        'image/png' => ['png'],
        'image/webp' => ['webp'],
        'text/plain' => ['txt'],
        'text/csv' => ['csv'],
        'application/json' => ['json'],
    ];

    /**
     * @var array<string, string>
     */
    private const EXTENSION_TO_MIME_TYPE = [
        'pdf' => 'application/pdf',
        'zip' => 'application/zip',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls' => 'application/vnd.ms-excel',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt' => 'application/vnd.ms-powerpoint',
        'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'txt' => 'text/plain',
        'csv' => 'text/csv',
        'json' => 'application/json',
    ];

    public function __construct(
        private readonly string $uploadDir,
        private readonly string $legacyPublicUploadDir,
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

        $mimeType = $this->detectMimeType($file);
        if ($mimeType === null || !array_key_exists($mimeType, self::ALLOWED_MIME_TYPES)) {
            throw new \InvalidArgumentException(sprintf('Unsupported delivery file type: %s', $mimeType ?? 'unknown'));
        }

        $targetDir = rtrim($this->uploadDir, '/') . '/booking-' . $bookingId;
        if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
            throw new \RuntimeException('Could not prepare delivery upload directory.');
        }

        $originalName = $file->getClientOriginalName() ?: 'delivery-file';
        $safeName = $this->sanitizeFileName(pathinfo($originalName, PATHINFO_FILENAME));
        $extension = self::ALLOWED_MIME_TYPES[$mimeType][0] ?? 'bin';
        $storedName = sprintf('%s-%s.%s', $safeName, bin2hex(random_bytes(6)), $extension);

        $file->move($targetDir, $storedName);

        $storagePath = 'booking-' . $bookingId . '/' . $storedName;

        return [
            'file_name' => $originalName,
            'storage_path' => $storagePath,
            'mime_type' => $mimeType,
            'size_bytes' => $size,
        ];
    }

    private function detectMimeType(UploadedFile $file): ?string
    {
        $pathname = $file->getPathname();
        if (!is_string($pathname) || $pathname === '' || !is_file($pathname)) {
            return null;
        }

        if (function_exists('finfo_open') && function_exists('finfo_file')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo !== false) {
                $detected = finfo_file($finfo, $pathname);
                finfo_close($finfo);

                if (is_string($detected) && $detected !== '') {
                    if ($detected !== 'application/octet-stream') {
                        return $detected;
                    }
                }
            }
        }

        $extension = strtolower((string) pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));
        if ($extension !== '' && isset(self::EXTENSION_TO_MIME_TYPE[$extension])) {
            return self::EXTENSION_TO_MIME_TYPE[$extension];
        }

        return null;
    }

    public function resolveStoredAttachmentPath(?string $storagePath): ?string
    {
        if ($storagePath === null || trim($storagePath) === '') {
            return null;
        }

        $normalizedPath = ltrim(trim($storagePath), '/');
        foreach ([$this->uploadDir, $this->legacyPublicUploadDir] as $rootDir) {
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

    public function removeStoredAttachment(?string $storagePath): void
    {
        $absolutePath = $this->resolveStoredAttachmentPath($storagePath);
        if ($absolutePath === null) {
            return;
        }

        if (is_file($absolutePath)) {
            @unlink($absolutePath);
        }

        $directory = dirname($absolutePath);
        $root = realpath($this->uploadDir) ?: rtrim($this->uploadDir, '/');

        while (is_dir($directory) && str_starts_with($directory, $root) && $directory !== $root) {
            $contents = scandir($directory);
            if ($contents === false || count($contents) > 2) {
                break;
            }

            @rmdir($directory);
            $directory = dirname($directory);
        }
    }

    private function sanitizeFileName(string $name): string
    {
        $clean = preg_replace('/[^A-Za-z0-9._-]+/', '-', trim($name)) ?: 'delivery-file';
        $clean = trim($clean, '-._');

        return $clean !== '' ? strtolower($clean) : 'delivery-file';
    }
}
