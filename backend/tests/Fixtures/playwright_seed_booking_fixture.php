<?php

declare(strict_types=1);

use App\Entity\Booking;
use App\Entity\Escrow;
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

$scenario = isset($argv[2]) && is_string($argv[2]) && trim($argv[2]) !== '' ? trim($argv[2]) : 'basic';
$clientEmail = sprintf('e2e_client_booking_%s@test.com', $suffix);
$vendorEmail = sprintf('e2e_vendor_booking_%s@test.com', $suffix);

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
    ->setCompanyName('Orbit Delivery Lab')
    ->setProfessionalHeadline('Protected delivery and reporting workspace vendor');
$vendorUser->setVendorProfile($profile);

$em->persist($client);
$em->persist($vendorUser);
$em->persist($profile);
$em->flush();

$serviceTypeId = (int) $conn->fetchOne('SELECT id FROM service_type ORDER BY id ASC LIMIT 1');
if ($serviceTypeId <= 0) {
    throw new RuntimeException('No service_type record found for booking fixture.');
}

$serviceType = $conn->fetchAssociative(
    'SELECT name, category FROM service_type WHERE id = :id LIMIT 1',
    ['id' => $serviceTypeId]
);
if (!is_array($serviceType)) {
    throw new RuntimeException('Service type lookup failed for booking fixture.');
}

$requestSummary = 'Orbit booking workspace smoke test';
$scopeDetails = 'Client needs one protected workspace to review delivery, payment, and thread updates.';
$deadlineNote = 'Need the first delivery check in two working days.';
$agreedPriceMinor = 185000;
$now = date('Y-m-d H:i:s');

$conn->insert('client_request', [
    'client_id' => (int) $client->getId(),
    'service_type_id' => $serviceTypeId,
    'selected_vendor_id' => (int) $profile->getId(),
    'assigned_by_admin_id' => null,
    'request_summary' => $requestSummary,
    'scope_details' => $scopeDetails,
    'deadline_note' => $deadlineNote,
    'budget_note' => null,
    'attachments_count' => null,
    'agreed_price_minor' => $agreedPriceMinor,
    'currency' => 'TZS',
    'agreed_timeline_note' => null,
    'admin_assignment_note' => null,
    'status' => 'awaiting_payment',
    'submitted_at' => $now,
    'matched_at' => $now,
    'assigned_at' => $now,
    'cancelled_at' => null,
    'created_at' => $now,
    'updated_at' => $now,
]);
$requestId = (int) $conn->lastInsertId();

$conn->insert('booking', [
    'client_id' => (int) $client->getId(),
    'client_request_id' => $requestId,
    'assigned_vendor_id' => (int) $vendorUser->getId(),
    'agreed_price_minor' => $agreedPriceMinor,
    'service_price_snapshot_minor' => $agreedPriceMinor,
    'currency' => 'TZS',
    'service_title_snapshot' => $serviceType['name'] ?? 'Platform request',
    'service_category_snapshot' => $serviceType['category'] ?? 'general',
    'escrow_id' => null,
    'status' => 'pending',
    'request_summary' => $requestSummary,
    'scope_details' => $scopeDetails,
    'deadline_note' => $deadlineNote,
    'created_at' => $now,
    'updated_at' => $now,
]);
$bookingId = (int) $conn->lastInsertId();

if ($scenario === 'active_escrow') {
    /** @var Booking|null $booking */
    $booking = $em->find(Booking::class, $bookingId);
    if (!$booking instanceof Booking) {
        throw new RuntimeException('Unable to reload booking fixture entity.');
    }

    $escrow = new Escrow(sprintf('E2E-ESCROW-%s', strtoupper($suffix)), $client, $vendorUser, $agreedPriceMinor, 'TZS');
    $escrow->setBooking($booking);
    $escrow->transitionToFunded(
        sprintf('pay-intent-%s', $suffix),
        sprintf('txn-%s', $suffix),
        ['provider' => 'MPESA', 'status' => 'FUNDED']
    );
    $escrow->transitionToActive();
    $em->persist($escrow);
    $em->flush();
}

fwrite(STDOUT, json_encode([
    'client' => [
        'email' => $clientEmail,
        'password' => $password,
    ],
    'vendor' => [
        'email' => $vendorEmail,
        'password' => $password,
        'company_name' => $profile->getCompanyName(),
    ],
    'booking_id' => $bookingId,
    'request_summary' => $requestSummary,
], JSON_THROW_ON_ERROR));

$kernel->shutdown();
