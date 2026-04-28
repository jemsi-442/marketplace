<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class UploadedFileSecurityInspector
{
    /**
     * @param array<string, list<string>> $allowedMimeTypes
     */
    public function detectAllowedMimeType(UploadedFile $file, array $allowedMimeTypes): ?string
    {
        $pathname = $file->getPathname();
        if (!is_string($pathname) || $pathname === '' || !is_file($pathname)) {
            return null;
        }

        $originalExtension = strtolower((string) pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));
        if ($originalExtension === '') {
            return null;
        }

        $head = file_get_contents($pathname, false, null, 0, 8192);
        if (!is_string($head) || $head === '') {
            return null;
        }

        $detectedMimeType = $this->detectMimeTypeFromContent($pathname, $head, $originalExtension);
        if ($detectedMimeType === null || !isset($allowedMimeTypes[$detectedMimeType])) {
            return null;
        }

        if (!in_array($originalExtension, $allowedMimeTypes[$detectedMimeType], true)) {
            return null;
        }

        return $detectedMimeType;
    }

    private function detectMimeTypeFromContent(string $pathname, string $head, string $originalExtension): ?string
    {
        if (str_starts_with($head, '%PDF-')) {
            return 'application/pdf';
        }

        if (str_starts_with($head, "\x89PNG\r\n\x1a\n")) {
            return 'image/png';
        }

        if (str_starts_with($head, "\xFF\xD8\xFF")) {
            return 'image/jpeg';
        }

        if (substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') {
            return 'image/webp';
        }

        if ($this->looksLikeZipContainer($head)) {
            return $this->detectZipMimeType($pathname, $originalExtension) ?? 'application/zip';
        }

        if (str_starts_with($head, "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1")) {
            return match ($originalExtension) {
                'doc' => 'application/msword',
                'xls' => 'application/vnd.ms-excel',
                'ppt' => 'application/vnd.ms-powerpoint',
                default => null,
            };
        }

        $finfoMimeType = $this->detectMimeTypeWithFinfo($pathname);
        if (is_string($finfoMimeType) && $finfoMimeType !== '' && $finfoMimeType !== 'application/octet-stream') {
            if (in_array($finfoMimeType, ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'], true)) {
                return $finfoMimeType;
            }
        }

        if ($this->looksLikeTextFile($pathname)) {
            if ($originalExtension === 'json') {
                $contents = file_get_contents($pathname);
                if (is_string($contents) && $this->looksLikeJson($contents)) {
                    return 'application/json';
                }

                return null;
            }

            return match ($originalExtension) {
                'txt' => 'text/plain',
                'csv' => 'text/csv',
                default => null,
            };
        }

        return null;
    }

    private function detectMimeTypeWithFinfo(string $pathname): ?string
    {
        if (!function_exists('finfo_open') || !function_exists('finfo_file')) {
            return null;
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo === false) {
            return null;
        }

        $detected = finfo_file($finfo, $pathname);
        finfo_close($finfo);

        return is_string($detected) && $detected !== '' ? $detected : null;
    }

    private function looksLikeZipContainer(string $head): bool
    {
        return str_starts_with($head, "PK\x03\x04")
            || str_starts_with($head, "PK\x05\x06")
            || str_starts_with($head, "PK\x07\x08");
    }

    private function detectZipMimeType(string $pathname, string $originalExtension): ?string
    {
        if (!class_exists(\ZipArchive::class)) {
            return $originalExtension === 'zip' ? 'application/zip' : null;
        }

        $zip = new \ZipArchive();
        if ($zip->open($pathname) !== true) {
            return null;
        }

        $hasWord = $zip->locateName('[Content_Types].xml') !== false
            && ($zip->locateName('word/document.xml') !== false || $zip->locateName('word/') !== false);
        $hasSpreadsheet = $zip->locateName('[Content_Types].xml') !== false
            && ($zip->locateName('xl/workbook.xml') !== false || $zip->locateName('xl/') !== false);
        $hasPresentation = $zip->locateName('[Content_Types].xml') !== false
            && ($zip->locateName('ppt/presentation.xml') !== false || $zip->locateName('ppt/') !== false);
        $zip->close();

        if ($hasWord) {
            return $originalExtension === 'docx'
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : null;
        }

        if ($hasSpreadsheet) {
            return $originalExtension === 'xlsx'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : null;
        }

        if ($hasPresentation) {
            return $originalExtension === 'pptx'
                ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                : null;
        }

        return $originalExtension === 'zip' ? 'application/zip' : null;
    }

    private function looksLikeTextFile(string $pathname): bool
    {
        $contents = file_get_contents($pathname, false, null, 0, 32768);
        if (!is_string($contents)) {
            return false;
        }

        if (str_contains($contents, "\0")) {
            return false;
        }

        return mb_check_encoding($contents, 'UTF-8');
    }

    private function looksLikeJson(string $contents): bool
    {
        $trimmed = trim($contents);
        if ($trimmed === '' || !in_array($trimmed[0], ['{', '['], true)) {
            return false;
        }

        json_decode($trimmed, true);

        return json_last_error() === JSON_ERROR_NONE;
    }
}
