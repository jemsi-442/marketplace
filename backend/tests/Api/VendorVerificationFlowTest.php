<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Symfony\Component\BrowserKit\Cookie as BrowserKitCookie;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

final class VendorVerificationFlowTest extends ApiTestCase
{
    public function testDirectResumeUploadPrepareIsUnavailableOnLocalDriver(): void
    {
        $password = 'Password123!';
        $registration = $this->registerUser('vendor_direct_prepare@test.com', $password, 'vendor');
        $this->verifyUser($registration['verification_url']);
        $login = $this->loginUser('vendor_direct_prepare@test.com', $password);
        $token = $login['token'];

        $profile = $this->requestJson('GET', '/api/vendor/profile', null, $token);
        if (!(bool) ($profile['exists'] ?? false)) {
            $create = $this->requestJson('POST', '/api/vendor/profile', [
                'companyName' => 'Direct Upload Studio',
            ], $token);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
            self::assertSame('Vendor profile created', $create['message'] ?? null);
        }

        $response = $this->requestJson('POST', '/api/vendor/profile/resume/direct-upload/prepare', [
            'file_name' => 'candidate-resume.pdf',
            'mime_type' => 'application/pdf',
        ], $token);

        self::assertResponseStatusCodeSame(Response::HTTP_CONFLICT);
        self::assertStringContainsString('Direct resume upload is not available', (string) ($response['error'] ?? ''));
    }

    public function testVendorCanDownloadUploadedResume(): void
    {
        $password = 'Password123!';
        $registration = $this->registerUser('vendor_resume_download@test.com', $password, 'vendor');
        $this->verifyUser($registration['verification_url']);
        $login = $this->loginUser('vendor_resume_download@test.com', $password);
        $token = $login['token'];

        $profile = $this->requestJson('GET', '/api/vendor/profile', null, $token);
        if (!(bool) ($profile['exists'] ?? false)) {
            $create = $this->requestJson('POST', '/api/vendor/profile', [
                'companyName' => 'Resume Download Studio',
            ], $token);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
            self::assertSame('Vendor profile created', $create['message'] ?? null);
        }

        $filePath = tempnam(sys_get_temp_dir(), 'vendor-resume-download-');
        self::assertIsString($filePath);
        file_put_contents($filePath, "Resume\nDelivery operations and reporting support.\n");

        $upload = $this->requestMultipart('POST', '/api/vendor/profile/resume', [], [
            'resume' => new UploadedFile($filePath, 'resume-download.txt', 'text/plain', null, true),
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertTrue((bool) ($upload['profile']['resume_uploaded'] ?? false));

        $link = $this->requestJson('GET', '/api/vendor/profile/resume/link', null, $token);
        self::assertIsString($link['url'] ?? null);

        $this->applyCookieToken($token);
        $this->client->request('GET', (string) $link['url']);

        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame('text/plain; charset=UTF-8', $this->client->getResponse()->headers->get('Content-Type'));
        self::assertStringContainsString(
            'attachment; filename=resume-download.txt',
            (string) $this->client->getResponse()->headers->get('Content-Disposition')
        );
    }

    public function testVendorCanUploadResumePassInterviewAndEarnBlueTick(): void
    {
        $password = 'Password123!';
        $registration = $this->registerUser('vendor_verification@test.com', $password, 'vendor');
        $this->verifyUser($registration['verification_url']);
        $login = $this->loginUser('vendor_verification@test.com', $password);
        $token = $login['token'];

        $profile = $this->requestJson('GET', '/api/vendor/profile', null, $token);
        if (!(bool) ($profile['exists'] ?? false)) {
            $create = $this->requestJson('POST', '/api/vendor/profile', [
                'companyName' => 'Verified Vendor Studio',
            ], $token);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
            self::assertSame('Vendor profile created', $create['message'] ?? null);
        }

        $update = $this->requestJson('PUT', '/api/vendor/profile', [
            'companyName' => 'Verified Vendor Studio',
            'professionalHeadline' => 'Operations and finance support partner for SME delivery teams',
            'resumeHighlights' => 'Managed recurring finance work, client reporting packs, and delivery updates for small businesses and project teams.',
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame('Vendor profile updated', $update['message'] ?? null);

        $filePath = tempnam(sys_get_temp_dir(), 'vendor-resume-');
        self::assertIsString($filePath);
        file_put_contents($filePath, "Vendor resume\nHandled reporting, client updates, workflow checks, and delivery planning.\n");

        $upload = $this->requestMultipart('POST', '/api/vendor/profile/resume', [], [
            'resume' => new UploadedFile($filePath, 'vendor-resume.txt', 'text/plain', null, true),
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertTrue((bool) ($upload['profile']['resume_uploaded'] ?? false));

        $serviceTypeId = $this->firstServiceTypeId();
        $vendorUserId = (int) $this->db->fetchOne('SELECT id FROM user WHERE email = :email LIMIT 1', ['email' => 'vendor_verification@test.com']);
        $this->seedVendorServiceCapability($vendorUserId, $serviceTypeId, 250000, 'experienced');

        $generate = $this->requestJson('POST', '/api/vendor/profile/interview/generate', [], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertCount(5, $generate['questions'] ?? []);
        self::assertSame('interview_ready', $generate['profile']['verification_status'] ?? null);

        $answers = [];
        foreach (($generate['questions'] ?? []) as $question) {
            $keywords = array_values(array_filter($question['keywords'] ?? [], static fn (mixed $value): bool => is_string($value) && $value !== ''));
            $answerText = sprintf(
                'First I review the client brief, invoice records, and current spreadsheet, then I split the work into a first draft, review round, and final handoff with a same day email update. I confirm the timeline in working days, keep a checklist for each deliverable, and track issues before delivery. %s',
                implode(' ', $keywords)
            );

            $answers[] = [
                'question_id' => $question['id'],
                'answer' => $answerText,
            ];
        }

        $submit = $this->requestJson('POST', '/api/vendor/profile/interview/submit', [
            'answers' => $answers,
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertTrue((bool) ($submit['passed'] ?? false));
        self::assertGreaterThanOrEqual(62, (int) ($submit['score'] ?? 0));
        self::assertTrue((bool) ($submit['profile']['verification_badge_granted'] ?? false));
        self::assertSame('verified', $submit['profile']['verification_status'] ?? null);
        self::assertIsArray($submit['profile']['interview_attempt_history'] ?? null);
        self::assertCount(1, $submit['profile']['interview_attempt_history'] ?? []);

        $summary = $this->requestJson('GET', '/api/vendor/profile/dashboard-summary', null, $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertTrue((bool) ($summary['verification_badge_granted'] ?? false));
    }

    public function testAdminCanReviewVendorVerificationBadge(): void
    {
        $vendorPassword = 'Password123!';
        $vendorRegistration = $this->registerUser('vendor_admin_review@test.com', $vendorPassword, 'vendor');
        $this->verifyUser($vendorRegistration['verification_url']);
        $vendorLogin = $this->loginUser('vendor_admin_review@test.com', $vendorPassword);
        $vendorToken = $vendorLogin['token'];

        $profile = $this->requestJson('GET', '/api/vendor/profile', null, $vendorToken);
        if (!(bool) ($profile['exists'] ?? false)) {
            $this->requestJson('POST', '/api/vendor/profile', [
                'companyName' => 'Vendor Admin Review Studio',
            ], $vendorToken);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        }

        $this->requestJson('PUT', '/api/vendor/profile', [
            'companyName' => 'Vendor Admin Review Studio',
            'professionalHeadline' => 'Content and documentation support partner',
            'resumeHighlights' => 'Handled donor reporting, proposal support, and structured documentation for client teams.',
        ], $vendorToken);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $filePath = tempnam(sys_get_temp_dir(), 'vendor-admin-review-');
        self::assertIsString($filePath);
        file_put_contents($filePath, "Resume\nDocumentation support and proposal work.\n");

        $this->requestMultipart('POST', '/api/vendor/profile/resume', [], [
            'resume' => new UploadedFile($filePath, 'vendor-admin-review.txt', 'text/plain', null, true),
        ], $vendorToken);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $serviceTypeId = $this->firstServiceTypeId();
        $vendorUserId = (int) $this->db->fetchOne('SELECT id FROM user WHERE email = :email LIMIT 1', ['email' => 'vendor_admin_review@test.com']);
        $this->seedVendorServiceCapability($vendorUserId, $serviceTypeId, 250000, 'experienced');

        $generate = $this->requestJson('POST', '/api/vendor/profile/interview/generate', [], $vendorToken);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $answers = [];
        foreach (($generate['questions'] ?? []) as $question) {
            $keywords = array_values(array_filter($question['keywords'] ?? [], static fn (mixed $value): bool => is_string($value) && $value !== ''));
            $answers[] = [
                'question_id' => $question['id'],
                'answer' => sprintf('First I check the brief, outline the draft, set review checkpoints, confirm working days, and send an email update before the final handoff. %s', implode(' ', $keywords)),
            ];
        }

        $this->requestJson('POST', '/api/vendor/profile/interview/submit', ['answers' => $answers], $vendorToken);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $adminPassword = 'Password123!';
        $adminRegistration = $this->registerUser('admin_vendor_review@test.com', $adminPassword, 'client');
        $this->verifyUser($adminRegistration['verification_url']);
        $this->promoteUserToAdmin('admin_vendor_review@test.com');
        $adminLogin = $this->loginUser('admin_vendor_review@test.com', $adminPassword);
        $adminToken = $adminLogin['token'];

        $list = $this->requestJson('GET', '/api/admin/vendor-verifications', null, $adminToken);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertGreaterThanOrEqual(1, (int) ($list['summary']['badge_active'] ?? 0));

        $vendorProfileId = (int) $this->db->fetchOne('SELECT id FROM vendor_profile WHERE user_id = :user_id LIMIT 1', ['user_id' => $vendorUserId]);

        $revoke = $this->requestJson('POST', sprintf('/api/admin/vendor-verifications/%d/review', $vendorProfileId), [
            'decision' => 'revoke',
            'review_note' => 'Resume is solid, but the vendor needs clearer delivery proof before the badge stays active.',
        ], $adminToken);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertFalse((bool) ($revoke['profile']['verification_badge_granted'] ?? true));
        self::assertSame('needs_revision', $revoke['profile']['verification_status'] ?? null);

        $approve = $this->requestJson('POST', sprintf('/api/admin/vendor-verifications/%d/review', $vendorProfileId), [
            'decision' => 'approve',
            'review_note' => 'Resume and practical answers are strong enough for the blue tick.',
        ], $adminToken);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertTrue((bool) ($approve['profile']['verification_badge_granted'] ?? false));
        self::assertSame('verified', $approve['profile']['verification_status'] ?? null);
    }

    public function testAdminCanDownloadVendorResumeFromVerificationQueue(): void
    {
        $vendorPassword = 'Password123!';
        $vendorRegistration = $this->registerUser('vendor_resume_admin_download@test.com', $vendorPassword, 'vendor');
        $this->verifyUser($vendorRegistration['verification_url']);
        $vendorLogin = $this->loginUser('vendor_resume_admin_download@test.com', $vendorPassword);
        $vendorToken = $vendorLogin['token'];

        $profile = $this->requestJson('GET', '/api/vendor/profile', null, $vendorToken);
        if (!(bool) ($profile['exists'] ?? false)) {
            $create = $this->requestJson('POST', '/api/vendor/profile', [
                'companyName' => 'Admin Resume Download Studio',
            ], $vendorToken);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
            self::assertSame('Vendor profile created', $create['message'] ?? null);
        }

        $filePath = tempnam(sys_get_temp_dir(), 'vendor-admin-resume-download-');
        self::assertIsString($filePath);
        file_put_contents($filePath, "Resume\nDocumentation, coordination, and reporting support.\n");

        $upload = $this->requestMultipart('POST', '/api/vendor/profile/resume', [], [
            'resume' => new UploadedFile($filePath, 'admin-review-resume.txt', 'text/plain', null, true),
        ], $vendorToken);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertTrue((bool) ($upload['profile']['resume_uploaded'] ?? false));

        $vendorUserId = (int) $this->db->fetchOne(
            'SELECT id FROM user WHERE email = :email LIMIT 1',
            ['email' => 'vendor_resume_admin_download@test.com']
        );
        $vendorProfileId = (int) $this->db->fetchOne(
            'SELECT id FROM vendor_profile WHERE user_id = :user_id LIMIT 1',
            ['user_id' => $vendorUserId]
        );

        $adminPassword = 'Password123!';
        $adminRegistration = $this->registerUser('admin_resume_download@test.com', $adminPassword, 'client');
        $this->verifyUser($adminRegistration['verification_url']);
        $this->promoteUserToAdmin('admin_resume_download@test.com');
        $adminLogin = $this->loginUser('admin_resume_download@test.com', $adminPassword);
        $adminToken = $adminLogin['token'];

        $link = $this->requestJson('GET', sprintf('/api/admin/vendor-verifications/%d/resume-link', $vendorProfileId), null, $adminToken);
        self::assertIsString($link['url'] ?? null);

        $this->applyCookieToken($adminToken);
        $this->client->request('GET', (string) $link['url']);

        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame('text/plain; charset=UTF-8', $this->client->getResponse()->headers->get('Content-Type'));
        self::assertStringContainsString(
            'attachment; filename=admin-review-resume.txt',
            (string) $this->client->getResponse()->headers->get('Content-Disposition')
        );
    }

    public function testGenericAiStyleAnswersDoNotEarnBlueTick(): void
    {
        $password = 'Password123!';
        $registration = $this->registerUser('vendor_generic_answers@test.com', $password, 'vendor');
        $this->verifyUser($registration['verification_url']);
        $login = $this->loginUser('vendor_generic_answers@test.com', $password);
        $token = $login['token'];

        $profile = $this->requestJson('GET', '/api/vendor/profile', null, $token);
        if (!(bool) ($profile['exists'] ?? false)) {
            $create = $this->requestJson('POST', '/api/vendor/profile', [
                'companyName' => 'Generic Answer Studio',
            ], $token);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
            self::assertSame('Vendor profile created', $create['message'] ?? null);
        }

        $this->requestJson('PUT', '/api/vendor/profile', [
            'companyName' => 'Generic Answer Studio',
            'professionalHeadline' => 'Operations support studio',
            'resumeHighlights' => 'Supports client operations and delivery coordination.',
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $filePath = tempnam(sys_get_temp_dir(), 'vendor-generic-');
        self::assertIsString($filePath);
        file_put_contents($filePath, "Resume\nGeneral operations support.\n");

        $this->requestMultipart('POST', '/api/vendor/profile/resume', [], [
            'resume' => new UploadedFile($filePath, 'vendor-generic.txt', 'text/plain', null, true),
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $serviceTypeId = $this->firstServiceTypeId();
        $vendorUserId = (int) $this->db->fetchOne('SELECT id FROM user WHERE email = :email LIMIT 1', ['email' => 'vendor_generic_answers@test.com']);
        $this->seedVendorServiceCapability($vendorUserId, $serviceTypeId, 180000, 'standard');

        $generate = $this->requestJson('POST', '/api/vendor/profile/interview/generate', [], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $answers = [];
        foreach (($generate['questions'] ?? []) as $question) {
            $answers[] = [
                'question_id' => $question['id'],
                'answer' => 'I would first leverage best practices to ensure high quality and provide a seamless solution aligned with client expectations and industry standards.',
            ];
        }

        $submit = $this->requestJson('POST', '/api/vendor/profile/interview/submit', [
            'answers' => $answers,
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertFalse((bool) ($submit['passed'] ?? true));
        self::assertLessThan(62, (int) ($submit['score'] ?? 100));
        self::assertFalse((bool) ($submit['profile']['verification_badge_granted'] ?? true));
        self::assertSame('needs_revision', $submit['profile']['verification_status'] ?? null);
    }

    public function testFinanceLaneAnswersRewardPracticalProofSignals(): void
    {
        $password = 'Password123!';
        $registration = $this->registerUser('vendor_finance_lane@test.com', $password, 'vendor');
        $this->verifyUser($registration['verification_url']);
        $login = $this->loginUser('vendor_finance_lane@test.com', $password);
        $token = $login['token'];

        $profile = $this->requestJson('GET', '/api/vendor/profile', null, $token);
        if (!(bool) ($profile['exists'] ?? false)) {
            $create = $this->requestJson('POST', '/api/vendor/profile', [
                'companyName' => 'Finance Lane Studio',
            ], $token);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
            self::assertSame('Vendor profile created', $create['message'] ?? null);
        }

        $this->requestJson('PUT', '/api/vendor/profile', [
            'companyName' => 'Finance Lane Studio',
            'professionalHeadline' => 'Finance operations partner for growing teams',
            'resumeHighlights' => 'Handled bookkeeping, reconciliations, cash flow reviews, and reporting packs for SMEs.',
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $filePath = tempnam(sys_get_temp_dir(), 'vendor-finance-');
        self::assertIsString($filePath);
        file_put_contents($filePath, "Resume\nBookkeeping, reconciliations, and finance reporting support.\n");

        $this->requestMultipart('POST', '/api/vendor/profile/resume', [], [
            'resume' => new UploadedFile($filePath, 'vendor-finance.txt', 'text/plain', null, true),
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $serviceTypeId = (int) $this->db->fetchOne(
            'SELECT id FROM service_type WHERE name = :name LIMIT 1',
            ['name' => 'Management Accounts Preparation']
        );
        self::assertGreaterThan(0, $serviceTypeId);

        $vendorUserId = (int) $this->db->fetchOne('SELECT id FROM user WHERE email = :email LIMIT 1', ['email' => 'vendor_finance_lane@test.com']);
        $this->seedVendorServiceCapability($vendorUserId, $serviceTypeId, 260000, 'experienced');

        $generate = $this->requestJson('POST', '/api/vendor/profile/interview/generate', [], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertTrue($this->questionSetContainsSignal($generate['questions'] ?? [], 'ledger'));
        self::assertTrue($this->questionSetContainsSignal($generate['questions'] ?? [], 'trial balance'));
        self::assertTrue($this->questionSetContainsSignal($generate['questions'] ?? [], 'reporting pack'));
        self::assertTrue($this->questionSetContainsText($generate['questions'] ?? [], 'management accounts'));

        $answers = [];
        foreach (($generate['questions'] ?? []) as $question) {
            $answers[] = [
                'question_id' => $question['id'],
                'answer' => 'First I check the invoice batch, ledger balances, and bank statement gaps, then I reconcile the spreadsheet, flag missing supporting documents, and build a draft reporting pack. I confirm the working-day timeline, send a same day email update, and close with a review round before final handoff.',
            ];
        }

        $submit = $this->requestJson('POST', '/api/vendor/profile/interview/submit', [
            'answers' => $answers,
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertTrue((bool) ($submit['passed'] ?? false));
        self::assertGreaterThanOrEqual(70, (int) ($submit['score'] ?? 0));
        self::assertTrue((bool) ($submit['profile']['verification_badge_granted'] ?? false));
    }

    public function testVendorMustPassVerificationBeforeOpeningRequestFeedOrSendingProposal(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("verify_gate_client_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("verify_gate_vendor_{$suffix}@test.com", $password, 'vendor');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);

        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Verification Gate Vendor');

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);

        $serviceTypeId = $this->firstServiceTypeId();
        $this->seedVendorServiceCapability((int) $vendorRegistration['user']['id'], $serviceTypeId, 210000, 'experienced');

        $requestCreate = $this->requestJson('POST', '/api/client-requests', [
            'service_type_id' => $serviceTypeId,
            'request_summary' => 'Verification gate request',
            'scope_details' => 'This should stay locked until vendor verification is complete.',
        ], $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $requestId = (int) ($requestCreate['request']['id'] ?? 0);
        self::assertGreaterThan(0, $requestId);

        $feedBlocked = $this->requestJson('GET', '/api/vendor/request-feed?view=needs_proposal&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);
        self::assertSame('Complete vendor verification before opening matched requests', $feedBlocked['error'] ?? null);

        $proposalBlocked = $this->requestJson('POST', sprintf('/api/client-requests/%d/interest', $requestId), [
            'proposed_price_minor' => 260000,
            'price_reason' => 'Verification gate proposal attempt before approval.',
            'timeline_note' => '4 working days',
            'message' => 'Trying to respond before verification is complete.',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);
        self::assertSame('Complete vendor verification before sending a proposal', $proposalBlocked['error'] ?? null);

        $this->markVendorVerified((int) $vendorRegistration['user']['id'], 84);

        $feedAllowed = $this->requestJson('GET', '/api/vendor/request-feed?view=needs_proposal&limit=10&page=1', null, $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame(1, $feedAllowed['total_items'] ?? null);
        self::assertSame('Verification gate request', $feedAllowed['items'][0]['request_summary'] ?? null);

        $proposalAllowed = $this->requestJson('POST', sprintf('/api/client-requests/%d/interest', $requestId), [
            'proposed_price_minor' => 260000,
            'price_reason' => 'Verification is complete and the working scope is covered.',
            'timeline_note' => '4 working days',
            'message' => 'Verified vendor proposal ready for admin review.',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        self::assertSame('Interest submitted successfully', $proposalAllowed['message'] ?? null);
    }

    public function testVendorResumeRejectsShellRenamedAsPdf(): void
    {
        $password = 'Password123!';
        $registration = $this->registerUser('vendor_resume_shell@test.com', $password, 'vendor');
        $this->verifyUser($registration['verification_url']);
        $login = $this->loginUser('vendor_resume_shell@test.com', $password);
        $token = $login['token'];

        $profile = $this->requestJson('GET', '/api/vendor/profile', null, $token);
        if (!(bool) ($profile['exists'] ?? false)) {
            $create = $this->requestJson('POST', '/api/vendor/profile', [
                'companyName' => 'Resume Shell Studio',
            ], $token);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
            self::assertSame('Vendor profile created', $create['message'] ?? null);
        }

        $this->requestJson('PUT', '/api/vendor/profile', [
            'companyName' => 'Resume Shell Studio',
            'professionalHeadline' => 'Testing upload hardening',
            'resumeHighlights' => 'This flow should reject disguised shell uploads.',
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $filePath = tempnam(sys_get_temp_dir(), 'vendor-shell-');
        self::assertIsString($filePath);
        file_put_contents($filePath, "<?php echo 'shell';");

        $upload = $this->requestMultipart('POST', '/api/vendor/profile/resume', [], [
            'resume' => new UploadedFile($filePath, 'candidate-resume.pdf', 'application/pdf', null, true),
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
        self::assertStringContainsString('Unsupported resume file type', (string) ($upload['error'] ?? ''));
    }

    public function testVendorResumeUploadIsRateLimited(): void
    {
        $password = 'Password123!';
        $registration = $this->registerUser('vendor_resume_limit@test.com', $password, 'vendor');
        $this->verifyUser($registration['verification_url']);
        $login = $this->loginUser('vendor_resume_limit@test.com', $password);
        $token = $login['token'];

        $profile = $this->requestJson('GET', '/api/vendor/profile', null, $token);
        if (!(bool) ($profile['exists'] ?? false)) {
            $this->requestJson('POST', '/api/vendor/profile', [
                'companyName' => 'Resume Limit Studio',
            ], $token);
            self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        }

        for ($attempt = 1; $attempt <= 4; ++$attempt) {
            $filePath = tempnam(sys_get_temp_dir(), 'vendor-resume-limit-');
            self::assertIsString($filePath);
            file_put_contents($filePath, "Resume attempt {$attempt}\nOperations and delivery support.\n");

            $this->requestMultipart('POST', '/api/vendor/profile/resume', [], [
                'resume' => new UploadedFile($filePath, sprintf('resume-attempt-%d.txt', $attempt), 'text/plain', null, true),
            ], $token);
            self::assertResponseStatusCodeSame(Response::HTTP_OK);
        }

        $blockedPath = tempnam(sys_get_temp_dir(), 'vendor-resume-limit-');
        self::assertIsString($blockedPath);
        file_put_contents($blockedPath, "Resume attempt 5\nOperations and delivery support.\n");

        $blocked = $this->requestMultipart('POST', '/api/vendor/profile/resume', [], [
            'resume' => new UploadedFile($blockedPath, 'resume-attempt-5.txt', 'text/plain', null, true),
        ], $token);
        self::assertResponseStatusCodeSame(Response::HTTP_TOO_MANY_REQUESTS);
        self::assertStringContainsString('Too many resume uploads', (string) ($blocked['error'] ?? ''));
    }

    /**
     * @param mixed $questions
     */
    private function questionSetContainsSignal(mixed $questions, string $signal): bool
    {
        if (!is_array($questions)) {
            return false;
        }

        foreach ($questions as $question) {
            if (!is_array($question) || !isset($question['practical_signals']) || !is_array($question['practical_signals'])) {
                continue;
            }

            foreach ($question['practical_signals'] as $candidate) {
                if (is_string($candidate) && $candidate === $signal) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @param mixed $questions
     */
    private function questionSetContainsText(mixed $questions, string $text): bool
    {
        if (!is_array($questions)) {
            return false;
        }

        $needle = mb_strtolower($text);

        foreach ($questions as $question) {
            if (!is_array($question)) {
                continue;
            }

            $title = isset($question['title']) && is_string($question['title']) ? mb_strtolower($question['title']) : '';
            $prompt = isset($question['prompt']) && is_string($question['prompt']) ? mb_strtolower($question['prompt']) : '';

            if (str_contains($title, $needle) || str_contains($prompt, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function applyCookieToken(string $token): void
    {
        $this->client->getCookieJar()->clear();

        foreach (explode(';', $token) as $segment) {
            $segment = trim($segment);
            if ($segment === '') {
                continue;
            }

            [$name, $value] = array_pad(explode('=', $segment, 2), 2, '');
            $this->client->getCookieJar()->set(new BrowserKitCookie($name, $value));
        }
    }
}
