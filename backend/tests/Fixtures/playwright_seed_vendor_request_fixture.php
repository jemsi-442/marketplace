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
$conn = $container->get('doctrine')->getConnection();
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
$scenario = isset($argv[2]) && is_string($argv[2]) && trim($argv[2]) !== ''
    ? trim($argv[2])
    : 'open';
if (!in_array($scenario, ['open', 'sent'], true)) {
    $scenario = 'open';
}

$clientEmail = sprintf('e2e_client_vendor_request_%s@test.com', $suffix);
$vendorEmail = sprintf('e2e_vendor_request_feed_%s@test.com', $suffix);
$vendorCompany = 'Orbit Delivery Systems';
$now = date('Y-m-d H:i:s');

$client = (new User())
    ->setEmail($clientEmail)
    ->setRoles(['ROLE_CLIENT', 'ROLE_USER'])
    ->setIsVerified(true)
    ->setPassword($hashedPassword);
$client->setVerificationToken(null);

$vendorUser = (new User())
    ->setEmail($vendorEmail)
    ->setRoles(['ROLE_VENDOR'])
    ->setIsVerified(true)
    ->setPassword($hashedPassword);
$vendorUser->setVerificationToken(null);

$profile = (new VendorProfile())
    ->setUser($vendorUser)
    ->setCompanyName($vendorCompany)
    ->setProfessionalHeadline('Platform-managed delivery vendor');
$vendorUser->setVendorProfile($profile);

$em->persist($client);
$em->persist($vendorUser);
$em->persist($profile);
$em->flush();

$serviceTypeId = (int) $conn->fetchOne('SELECT id FROM service_type ORDER BY id ASC LIMIT 1');
if ($serviceTypeId <= 0) {
    throw new RuntimeException('No service_type record found for vendor request fixture.');
}

$serviceType = $conn->fetchAssociative(
    'SELECT name, category FROM service_type WHERE id = :id LIMIT 1',
    ['id' => $serviceTypeId]
);
if (!is_array($serviceType)) {
    throw new RuntimeException('Service type lookup failed for vendor request fixture.');
}

$conn->executeStatement(
    <<<'SQL'
UPDATE vendor_profile
SET verification_status = :status,
    verification_badge_granted = 1,
    verification_badge_granted_at = NOW(),
    verification_review_note = :review_note,
    interview_score = :score,
    interview_submitted_at = NOW()
WHERE user_id = :user_id
SQL,
    [
        'status' => 'verified',
        'review_note' => 'Fixture verification granted for request feed access.',
        'score' => 84,
        'user_id' => (int) $vendorUser->getId(),
    ]
);

$vendorProfileId = (int) $conn->fetchOne(
    'SELECT id FROM vendor_profile WHERE user_id = :user_id LIMIT 1',
    ['user_id' => (int) $vendorUser->getId()]
);
if ($vendorProfileId <= 0) {
    throw new RuntimeException('Unable to resolve vendor profile id for vendor request fixture.');
}

$conn->insert('vendor_service_capability', [
    'vendor_id' => $vendorProfileId,
    'service_type_id' => $serviceTypeId,
    'is_active' => 1,
    'experience_level' => 'experienced',
    'starting_price_minor' => 285000,
    'portfolio_summary' => 'Strong request handling for platform-managed delivery.',
    'capacity_status' => 'available',
    'turnaround_note' => '4 working days',
    'approved_by_admin' => 1,
    'admin_review_note' => 'Approved for vendor request feed smoke coverage.',
    'reviewed_at' => $now,
    'reviewed_by_admin_id' => null,
    'created_at' => $now,
    'updated_at' => $now,
]);

$requestSummary = 'Orbit vendor request feed smoke test';
$scopeDetails = 'Client needs a clear vendor proposal, platform note, and delivery timing for one managed request.';
$deadlineNote = 'Need a first proposal within two working days.';
$budgetNote = 'Client expects pricing near 300000 TZS.';

$conn->insert('client_request', [
    'client_id' => (int) $client->getId(),
    'service_type_id' => $serviceTypeId,
    'selected_vendor_id' => null,
    'assigned_by_admin_id' => null,
    'request_summary' => $requestSummary,
    'scope_details' => $scopeDetails,
    'deadline_note' => $deadlineNote,
    'budget_note' => $budgetNote,
    'attachments_count' => null,
    'agreed_price_minor' => null,
    'currency' => 'TZS',
    'agreed_timeline_note' => null,
    'admin_assignment_note' => null,
    'status' => 'vendor_interest_open',
    'submitted_at' => $now,
    'matched_at' => $now,
    'assigned_at' => null,
    'cancelled_at' => null,
    'created_at' => $now,
    'updated_at' => $now,
]);
$requestId = (int) $conn->lastInsertId();

if ($scenario === 'sent') {
    $conn->insert('vendor_request_interest', [
        'client_request_id' => $requestId,
        'vendor_id' => $vendorProfileId,
        'message' => 'We can keep the delivery clear and move through one managed handoff.',
        'proposed_price_minor' => 295000,
        'price_reason' => 'Covers the first delivery pass, platform coordination, and one review update.',
        'timeline_note' => '4 working days',
        'status' => 'submitted',
        'submitted_at' => $now,
        'reviewed_at' => null,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
}

fwrite(STDOUT, json_encode([
    'client' => [
        'email' => $clientEmail,
    ],
    'vendor' => [
        'email' => $vendorEmail,
        'password' => $password,
        'company_name' => $vendorCompany,
    ],
    'request_id' => $requestId,
    'request_summary' => $requestSummary,
    'service_name' => $serviceType['name'] ?? 'Platform service',
    'timeline_note' => '4 working days',
    'scenario' => $scenario,
], JSON_THROW_ON_ERROR));

$kernel->shutdown();
