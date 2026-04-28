<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\SignedObjectTransferTokenService;
use PHPUnit\Framework\TestCase;

final class SignedObjectTransferTokenServiceTest extends TestCase
{
    public function testIssuedTokenValidatesWithSamePayload(): void
    {
        $service = new SignedObjectTransferTokenService('test-secret');
        $token = $service->issue('vendor_resume_direct_upload', 'vendor-5/resume.txt', [
            'file_name' => 'resume.txt',
            'mime_type' => 'text/plain',
        ], 180);

        self::assertTrue($service->isValid('vendor_resume_direct_upload', 'vendor-5/resume.txt', [
            'file_name' => 'resume.txt',
            'mime_type' => 'text/plain',
        ], $token['expires'], $token['signature']));
    }

    public function testTokenFailsWhenPayloadChanges(): void
    {
        $service = new SignedObjectTransferTokenService('test-secret');
        $token = $service->issue('vendor_resume_direct_upload', 'vendor-5/resume.txt', [
            'file_name' => 'resume.txt',
            'mime_type' => 'text/plain',
        ], 180);

        self::assertFalse($service->isValid('vendor_resume_direct_upload', 'vendor-5/resume.txt', [
            'file_name' => 'resume.pdf',
            'mime_type' => 'application/pdf',
        ], $token['expires'], $token['signature']));
    }
}
