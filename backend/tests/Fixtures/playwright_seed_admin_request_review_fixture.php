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

$adminEmail = sprintf('e2e_admin_request_%s@test.com', $suffix);
$clientEmail = sprintf('e2e_client_request_%s@test.com', $suffix);
$vendorEmail = sprintf('e2e_vendor_request_%s@test.com', $suffix);
$now = date('Y-m-d H:i:s');

$admin = (new User())
    ->setEmail($adminEmail)
    ->setRoles(['ROLE_ADMIN'])
    ->setIsVerified(true)
    ->setPassword($hashedPassword);
$admin->setVerificationToken(null);

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
    ->setCompanyName('Orbit Proposal Lab')
    ->setProfessionalHeadline('Managed platform delivery vendor');
$vendorUser->setVendorProfile($profile);

$em->persist($admin);
$em->persist($client);
$em->persist($vendorUser);
$em->persist($profile);
$em->flush();

$serviceTypeId = (int) $conn->fetchOne('SELECT id FROM service_type ORDER BY id ASC LIMIT 1');
if ($serviceTypeId <= 0) {
    throw new RuntimeException('No service_type record found for admin request fixture.');
}

$serviceType = $conn->fetchAssociative(
    'SELECT name, category FROM service_type WHERE id = :id LIMIT 1',
    ['id' => $serviceTypeId]
);
if (!is_array($serviceType)) {
    throw new RuntimeException('Service type lookup failed for admin request fixture.');
}

$requestSummary = 'Orbit admin request review smoke test';
$scopeDetails = 'Client needs one vendor path selected with a clear commercial note and delivery timing.';
$deadlineNote = 'Need vendor confirmation within two working days.';
$budgetNote = 'Target around 320000 TZS if the delivery path is clear.';
$proposedPriceMinor = 315000;
$timelineNote = '4 working days';
$priceReason = 'Includes platform coordination, delivery review, and one handoff revision.';
$proposalMessage = 'We can take this platform-managed request and keep the client updates clear through delivery.';

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

$conn->insert('vendor_request_interest', [
    'client_request_id' => $requestId,
    'vendor_id' => (int) $profile->getId(),
    'message' => $proposalMessage,
    'proposed_price_minor' => $proposedPriceMinor,
    'price_reason' => $priceReason,
    'timeline_note' => $timelineNote,
    'status' => 'submitted',
    'submitted_at' => $now,
    'reviewed_at' => null,
    'created_at' => $now,
    'updated_at' => $now,
]);
$interestId = (int) $conn->lastInsertId();

fwrite(STDOUT, json_encode([
    'admin' => [
        'id' => (int) $admin->getId(),
        'email' => $adminEmail,
        'password' => $password,
    ],
    'client' => [
        'id' => (int) $client->getId(),
        'email' => $clientEmail,
    ],
    'vendor' => [
        'id' => (int) $vendorUser->getId(),
        'email' => $vendorEmail,
        'company_name' => $profile->getCompanyName(),
    ],
    'request_id' => $requestId,
    'interest_id' => $interestId,
    'request_summary' => $requestSummary,
    'service_name' => $serviceType['name'] ?? 'Platform service',
    'timeline_note' => $timelineNote,
], JSON_THROW_ON_ERROR));

$kernel->shutdown();
