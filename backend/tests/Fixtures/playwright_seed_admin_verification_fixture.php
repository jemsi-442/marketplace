<?php

declare(strict_types=1);

use App\Entity\User;
use App\Entity\VendorProfile;
use App\Kernel;
use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__, 2) . '/vendor/autoload.php';

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__, 2) . '/.env');
}

$_SERVER['APP_ENV'] = $_ENV['APP_ENV'] = 'dev';
$_SERVER['APP_DEBUG'] = $_ENV['APP_DEBUG'] = '0';

$kernel = new Kernel('dev', false);
$kernel->boot();
$container = $kernel->getContainer();

/** @var \Doctrine\ORM\EntityManagerInterface $em */
$em = $container->get('doctrine')->getManager();
$uploadDir = (string) $container->getParameter('vendor.resume.upload_dir');
$password = 'Password123!';
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);
if (!is_string($hashedPassword) || $hashedPassword === '') {
    throw new RuntimeException('Unable to hash the Playwright fixture password.');
}
$suffix = isset($argv[1]) && is_string($argv[1]) && trim($argv[1]) !== ''
    ? preg_replace('/[^A-Za-z0-9_-]+/', '', trim($argv[1]))
    : bin2hex(random_bytes(6));

if (!is_string($suffix) || $suffix === '') {
    $suffix = bin2hex(random_bytes(6));
}

$adminEmail = sprintf('e2e_admin_review_%s@test.com', $suffix);
$vendorEmail = sprintf('e2e_vendor_review_%s@test.com', $suffix);
$now = new DateTimeImmutable('now');

$admin = (new User())
    ->setEmail($adminEmail)
    ->setRoles(['ROLE_ADMIN'])
    ->setIsVerified(true)
    ->setPassword($hashedPassword);
$admin->setVerificationToken(null);

$vendorUser = (new User())
    ->setEmail($vendorEmail)
    ->setRoles(['ROLE_VENDOR'])
    ->setIsVerified(true)
    ->setPassword($hashedPassword);
$vendorUser->setVerificationToken(null);

$profile = (new VendorProfile())
    ->setUser($vendorUser)
    ->setCompanyName('Orbit Stack Studio')
    ->setProfessionalHeadline('Finance systems and delivery ops specialist')
    ->setResumeHighlights('Leads reconciliation packs, delivery checklists, and reporting reviews for platform clients.')
    ->setVerificationStatus(VendorProfile::VERIFICATION_NEEDS_REVISION)
    ->setInterviewQuestions([
        [
            'id' => 'finance-close-review',
            'title' => 'Month-end close review',
            'prompt' => 'Walk through how you prepare a month-end reporting pack for a client who has missing ledger entries and two unresolved bank lines.',
            'keywords' => ['ledger', 'variance', 'bank'],
            'practical_signals' => ['ledger', 'reconcile', 'bank statement', 'variance', 'reporting pack'],
        ],
        [
            'id' => 'delivery-handoff',
            'title' => 'Delivery handoff',
            'prompt' => 'Explain how you hand over a completed reporting pack so the client can approve it without chasing for missing details.',
            'keywords' => ['handoff', 'timeline', 'client'],
            'practical_signals' => ['handoff', 'checklist', 'deadline', 'review comments'],
        ],
    ])
    ->setInterviewAnswers([
        [
            'question_id' => 'finance-close-review',
            'answer' => 'I pull the ledger, reconcile it against the bank statement, flag variance lines, then prepare the reporting pack with notes on unresolved entries for the client review.',
            'word_count' => 28,
            'keyword_hits' => 3,
            'practical_signal_hits' => 4,
            'lane_practical_signal_hits' => 4,
            'timeline_signal_hits' => 1,
            'number_signals' => 1,
            'generic_phrase_hits' => 0,
            'score' => 78,
        ],
        [
            'question_id' => 'delivery-handoff',
            'answer' => 'I send the draft with a checklist, call out the deadline for review comments, and keep a short handoff note so finance and the client see the same version.',
            'word_count' => 31,
            'keyword_hits' => 2,
            'practical_signal_hits' => 3,
            'lane_practical_signal_hits' => 2,
            'timeline_signal_hits' => 1,
            'number_signals' => 0,
            'generic_phrase_hits' => 0,
            'score' => 70,
        ],
    ])
    ->setInterviewAttemptHistory([
        [
            'submitted_at' => $now->modify('-3 days')->format('Y-m-d H:i:s'),
            'score' => 61,
            'passed' => false,
            'note' => 'Needs clearer proof of ledger review steps.',
            'badge_granted' => false,
        ],
        [
            'submitted_at' => $now->modify('-1 day')->format('Y-m-d H:i:s'),
            'score' => 74,
            'passed' => false,
            'note' => 'Stronger finance proof, but still under review.',
            'badge_granted' => false,
        ],
    ])
    ->setInterviewScore(74)
    ->setInterviewSubmittedAt($now->modify('-1 day'))
    ->setVerificationReviewNote('Review the handoff detail before reactivating the blue tick.');

$vendorUser->setVendorProfile($profile);

$em->persist($admin);
$em->persist($vendorUser);
$em->persist($profile);
$em->flush();

$storedFileName = sprintf('orbit-stack-review-%s.pdf', $suffix);
$relativeStoragePath = sprintf('vendor-%d/%s', (int) $profile->getId(), $storedFileName);
$absoluteDirectory = $uploadDir . DIRECTORY_SEPARATOR . sprintf('vendor-%d', (int) $profile->getId());
$absolutePath = $uploadDir . DIRECTORY_SEPARATOR . $relativeStoragePath;

if (!is_dir($absoluteDirectory) && !mkdir($absoluteDirectory, 0775, true) && !is_dir($absoluteDirectory)) {
    throw new RuntimeException(sprintf('Failed to create resume directory: %s', $absoluteDirectory));
}

$pdfContent = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R>>endobj\n4 0 obj<</Length 74>>stream\nBT /F1 14 Tf 20 100 Td (Orbit Stack Studio verification resume) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n256\n%%EOF\n";

if (file_put_contents($absolutePath, $pdfContent) === false) {
    throw new RuntimeException(sprintf('Failed to write resume fixture file: %s', $absolutePath));
}

$profile
    ->replaceResume('orbit-stack-verification-resume.pdf', $relativeStoragePath, 'application/pdf')
    ->setVerificationStatus(VendorProfile::VERIFICATION_NEEDS_REVISION)
    ->setInterviewQuestions($profile->getInterviewQuestions())
    ->setInterviewAnswers($profile->getInterviewAnswers())
    ->setInterviewAttemptHistory($profile->getInterviewAttemptHistory())
    ->setInterviewScore(74)
    ->setInterviewSubmittedAt($now->modify('-1 day'))
    ->setVerificationReviewNote('Review the handoff detail before reactivating the blue tick.');

$em->flush();

fwrite(STDOUT, json_encode([
    'admin' => [
        'email' => $adminEmail,
        'password' => $password,
    ],
    'vendor' => [
        'email' => $vendorEmail,
        'password' => $password,
        'company_name' => $profile->getCompanyName(),
    ],
    'profile_id' => (int) $profile->getId(),
], JSON_THROW_ON_ERROR));

$kernel->shutdown();
