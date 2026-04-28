<?php

declare(strict_types=1);

use App\Entity\Booking;
use App\Entity\User;
use App\Entity\VendorProfile;
use App\Kernel;
use App\Controller\Api\EscrowController;
use App\Service\EscrowService;
use Doctrine\ORM\EntityManagerInterface;
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

/** @var EntityManagerInterface $em */
$em = $container->get('doctrine')->getManager();
$conn = $container->get('doctrine')->getConnection();
/** @var EscrowController $escrowController */
$escrowController = $container->get(EscrowController::class);
$escrowServiceProperty = new ReflectionProperty(EscrowController::class, 'escrowService');
$escrowServiceProperty->setAccessible(true);
/** @var EscrowService $escrowService */
$escrowService = $escrowServiceProperty->getValue($escrowController);

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

$adminEmail = sprintf('e2e_admin_escrow_%s@test.com', $suffix);
$clientEmail = sprintf('e2e_client_escrow_%s@test.com', $suffix);
$vendorEmail = sprintf('e2e_vendor_escrow_%s@test.com', $suffix);
$vendorCompany = 'Orbit Escrow Studio';
$requestSummary = 'Orbit disputed escrow smoke test';
$disputeReason = 'The client says the delivery is incomplete and wants admin to review payment before it is released.';
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
    ->setCompanyName($vendorCompany)
    ->setProfessionalHeadline('Escrow dispute fixture vendor');
$vendorUser->setVendorProfile($profile);

$em->persist($admin);
$em->persist($client);
$em->persist($vendorUser);
$em->persist($profile);
$em->flush();

$serviceTypeId = (int) $conn->fetchOne('SELECT id FROM service_type ORDER BY id ASC LIMIT 1');
if ($serviceTypeId <= 0) {
    throw new RuntimeException('No service_type record found for admin escrow fixture.');
}

$serviceType = $conn->fetchAssociative(
    'SELECT name, category FROM service_type WHERE id = :id LIMIT 1',
    ['id' => $serviceTypeId]
);
if (!is_array($serviceType)) {
    throw new RuntimeException('Service type lookup failed for admin escrow fixture.');
}

$agreedPriceMinor = 185000;
$scopeDetails = 'Client needs admin review on a protected booking after opening a dispute.';
$deadlineNote = 'Dispute should be reviewed today.';

$conn->insert('client_request', [
    'client_id' => (int) $client->getId(),
    'service_type_id' => $serviceTypeId,
    'selected_vendor_id' => (int) $profile->getId(),
    'assigned_by_admin_id' => (int) $admin->getId(),
    'request_summary' => $requestSummary,
    'scope_details' => $scopeDetails,
    'deadline_note' => $deadlineNote,
    'budget_note' => null,
    'attachments_count' => null,
    'agreed_price_minor' => $agreedPriceMinor,
    'currency' => 'TZS',
    'agreed_timeline_note' => '4 working days',
    'admin_assignment_note' => 'Escrow smoke fixture assignment.',
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

/** @var Booking|null $booking */
$booking = $em->find(Booking::class, $bookingId);
if (!$booking instanceof Booking) {
    throw new RuntimeException('Unable to reload booking fixture entity.');
}

$managedClient = $em->getRepository(User::class)->find($client->getId());
if (!$managedClient instanceof User) {
    throw new RuntimeException('Unable to reload client user for admin escrow fixture.');
}

$escrow = $escrowService->createEscrow($booking, $managedClient, $agreedPriceMinor, 'TZS');
$escrowService->handleCollectionWebhook([
    'reference' => $escrow->getReference(),
    'gateway_reference' => 'payref_admin_escrow_' . $suffix,
    'status' => 'SUCCESS',
    'transaction_id' => 'txn_admin_escrow_' . $suffix,
    'data' => [
        'reference' => 'payref_admin_escrow_' . $suffix,
        'status' => 'success',
    ],
]);
$escrowService->openDispute($escrow, $managedClient, [
    'reason' => $disputeReason,
    'source' => 'PLAYWRIGHT_FIXTURE',
]);

fwrite(STDOUT, json_encode([
    'admin' => [
        'email' => $adminEmail,
        'password' => $password,
    ],
    'escrow' => [
        'id' => $escrow->getId(),
        'reference' => $escrow->getReference(),
    ],
    'booking_id' => $bookingId,
    'request_summary' => $requestSummary,
    'dispute_reason' => $disputeReason,
], JSON_THROW_ON_ERROR));

$kernel->shutdown();
