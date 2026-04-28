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

$adminEmail = sprintf('e2e_admin_capability_%s@test.com', $suffix);
$vendorEmail = sprintf('e2e_vendor_capability_%s@test.com', $suffix);
$vendorCompany = 'Orbit Capability Studio';
$now = date('Y-m-d H:i:s');

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
    ->setCompanyName($vendorCompany)
    ->setProfessionalHeadline('Platform-managed capability vendor');
$vendorUser->setVendorProfile($profile);

$em->persist($admin);
$em->persist($vendorUser);
$em->persist($profile);
$em->flush();

$serviceTypeRow = $conn->fetchAssociative(
    <<<'SQL'
SELECT id, name, category
FROM service_type
ORDER BY id ASC
LIMIT 1
SQL
);

if (!is_array($serviceTypeRow) || !isset($serviceTypeRow['id'])) {
    throw new RuntimeException('No service_type record found for admin capability fixture.');
}

$serviceTypeId = (int) $serviceTypeRow['id'];
$vendorProfileId = (int) $profile->getId();

$conn->insert('vendor_service_capability', [
    'vendor_id' => $vendorProfileId,
    'service_type_id' => $serviceTypeId,
    'is_active' => 1,
    'experience_level' => 'experienced',
    'starting_price_minor' => 340000,
    'portfolio_summary' => 'Strong lane proof with clear delivery checkpoints and platform-friendly updates.',
    'capacity_status' => 'available',
    'turnaround_note' => '5 working days',
    'approved_by_admin' => 0,
    'admin_review_note' => null,
    'reviewed_at' => null,
    'reviewed_by_admin_id' => null,
    'created_at' => $now,
    'updated_at' => $now,
]);
$capabilityId = (int) $conn->lastInsertId();

fwrite(STDOUT, json_encode([
    'admin' => [
        'email' => $adminEmail,
        'password' => $password,
    ],
    'vendor' => [
        'email' => $vendorEmail,
        'company_name' => $vendorCompany,
    ],
    'capability' => [
        'id' => $capabilityId,
        'service_name' => (string) ($serviceTypeRow['name'] ?? 'Capability service'),
        'category' => (string) ($serviceTypeRow['category'] ?? 'Capability lane'),
    ],
], JSON_THROW_ON_ERROR));

$kernel->shutdown();
