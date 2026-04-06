<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\User;
use Doctrine\DBAL\Connection;
use Symfony\Component\BrowserKit\Cookie as BrowserKitCookie;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

abstract class ApiTestCase extends WebTestCase
{
    protected KernelBrowser $client;
    protected Connection $db;
    private bool $transactionStarted = false;

    protected function setUp(): void
    {
        parent::setUp();

        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->client->disableReboot();
        $this->db = static::getContainer()->get(Connection::class);
        $this->db->beginTransaction();
        $this->transactionStarted = true;
    }

    protected function tearDown(): void
    {
        if ($this->transactionStarted) {
            while ($this->db->isTransactionActive()) {
                $this->db->rollBack();
            }
        }

        $this->transactionStarted = false;

        parent::tearDown();
    }

    protected function registerUser(string $email, string $password, string $type): array
    {
        $response = $this->requestJson('POST', '/api/register', [
            'email' => $email,
            'password' => $password,
            'type' => $type,
        ]);

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        return $response;
    }

    protected function loginUser(string $email, string $password): array
    {
        $response = $this->requestJson('POST', '/api/login', [
            'email' => $email,
            'password' => $password,
        ]);

        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $response['token'] = $this->buildCookieHeader($this->client);

        return $response;
    }

    protected function verifyUser(string $verificationUrl): void
    {
        $parts = parse_url($verificationUrl);
        $path = ($parts['path'] ?? '') . (isset($parts['query']) ? '?' . $parts['query'] : '');

        $this->client->request('GET', $path);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
    }

    protected function promoteUserToAdmin(string $email): void
    {
        $this->db->executeStatement(
            'UPDATE user SET roles = :roles WHERE email = :email',
            [
                'roles' => '["ROLE_ADMIN"]',
                'email' => $email,
            ]
        );
    }

    protected function seedVendorProfile(int $userId, string $companyName): void
    {
        $this->db->executeStatement(
            <<<'SQL'
INSERT INTO vendor_profile (company_name, bio, website, portfolio_link, user_id)
SELECT :company_name, NULL, NULL, NULL, :user_id
WHERE NOT EXISTS (
    SELECT 1 FROM vendor_profile WHERE user_id = :user_id
)
SQL,
            [
                'company_name' => $companyName,
                'user_id' => $userId,
            ]
        );
    }

    protected function firstServiceTypeId(): int
    {
        return (int) $this->db->fetchOne('SELECT id FROM service_type ORDER BY id ASC LIMIT 1');
    }

    protected function seedVendorServiceCapability(
        int $vendorUserId,
        int $serviceTypeId,
        ?int $startingPriceMinor = null,
        string $experienceLevel = 'standard'
    ): void {
        $vendorProfileId = (int) $this->db->fetchOne(
            'SELECT id FROM vendor_profile WHERE user_id = :user_id LIMIT 1',
            ['user_id' => $vendorUserId]
        );

        $this->db->executeStatement(
            <<<'SQL'
INSERT INTO vendor_service_capability (
    vendor_id,
    service_type_id,
    is_active,
    experience_level,
    starting_price_minor,
    portfolio_summary,
    capacity_status,
    turnaround_note,
    approved_by_admin,
    created_at,
    updated_at
)
SELECT
    :vendor_id,
    :service_type_id,
    1,
    :experience_level,
    :starting_price_minor,
    :portfolio_summary,
    :capacity_status,
    :turnaround_note,
    1,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM vendor_service_capability
    WHERE vendor_id = :vendor_id
      AND service_type_id = :service_type_id
)
SQL,
            [
                'vendor_id' => $vendorProfileId,
                'service_type_id' => $serviceTypeId,
                'experience_level' => $experienceLevel,
                'starting_price_minor' => $startingPriceMinor,
                'portfolio_summary' => 'Fixture capability summary',
                'capacity_status' => 'available',
                'turnaround_note' => '2 to 3 working days',
            ]
        );
    }

    /**
     * @return array{request_id: int, booking_id: int}
     */
    protected function seedPlatformManagedBooking(
        int $clientUserId,
        int $vendorUserId,
        string $requestSummary,
        ?int $serviceTypeId = null,
        int $agreedPriceMinor = 150000,
        string $requestStatus = 'awaiting_payment',
        string $bookingStatus = 'pending',
        ?string $scopeDetails = null,
        ?string $deadlineNote = null
    ): array {
        $serviceTypeId ??= $this->firstServiceTypeId();

        $vendorProfileId = (int) $this->db->fetchOne(
            'SELECT id FROM vendor_profile WHERE user_id = :user_id LIMIT 1',
            ['user_id' => $vendorUserId]
        );

        $serviceType = $this->db->fetchAssociative(
            'SELECT name, category FROM service_type WHERE id = :id LIMIT 1',
            ['id' => $serviceTypeId]
        );

        self::assertIsArray($serviceType);

        $this->db->insert('client_request', [
            'client_id' => $clientUserId,
            'service_type_id' => $serviceTypeId,
            'selected_vendor_id' => $vendorProfileId,
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
            'status' => $requestStatus,
            'submitted_at' => date('Y-m-d H:i:s'),
            'matched_at' => date('Y-m-d H:i:s'),
            'assigned_at' => date('Y-m-d H:i:s'),
            'cancelled_at' => null,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        $requestId = (int) $this->db->lastInsertId();

        $this->db->insert('booking', [
            'client_id' => $clientUserId,
            'client_request_id' => $requestId,
            'assigned_vendor_id' => $vendorUserId,
            'agreed_price_minor' => $agreedPriceMinor,
            'service_price_snapshot_minor' => $agreedPriceMinor,
            'currency' => 'TZS',
            'service_title_snapshot' => $serviceType['name'] ?? 'Platform request',
            'service_category_snapshot' => $serviceType['category'] ?? 'general',
            'escrow_id' => null,
            'status' => $bookingStatus,
            'request_summary' => $requestSummary,
            'scope_details' => $scopeDetails,
            'deadline_note' => $deadlineNote,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        $bookingId = (int) $this->db->lastInsertId();

        return [
            'request_id' => $requestId,
            'booking_id' => $bookingId,
        ];
    }

    protected function seedEscrow(
        string $reference,
        int $clientId,
        int $vendorId,
        int $amountMinor = 250000,
        string $currency = 'TZS',
        string $status = 'CREATED',
        ?string $externalPaymentReference = null
    ): int {
        $this->db->executeStatement(
            <<<'SQL'
INSERT INTO escrow (
    amount_minor,
    currency,
    status,
    created_at,
    client_id,
    vendor_id,
    reference,
    external_payment_reference,
    updated_at
)
VALUES (
    :amount_minor,
    :currency,
    :status,
    NOW(),
    :client_id,
    :vendor_id,
    :reference,
    :external_payment_reference,
    NOW()
)
SQL,
            [
                'amount_minor' => $amountMinor,
                'currency' => $currency,
                'status' => $status,
                'client_id' => $clientId,
                'vendor_id' => $vendorId,
                'reference' => $reference,
                'external_payment_reference' => $externalPaymentReference,
            ]
        );

        return (int) $this->db->fetchOne(
            'SELECT id FROM escrow WHERE reference = :reference LIMIT 1',
            ['reference' => $reference]
        );
    }

    protected function requestJson(
        string $method,
        string $uri,
        ?array $payload = null,
        ?string $token = null
    ): array {
        $server = ['CONTENT_TYPE' => 'application/json'];
        $this->client->getCookieJar()->clear();

        if ($token !== null) {
            if (str_contains($token, '=')) {
                foreach (explode(';', $token) as $segment) {
                    $segment = trim($segment);
                    if ($segment === '') {
                        continue;
                    }

                    [$name, $value] = array_pad(explode('=', $segment, 2), 2, '');
                    $this->client->getCookieJar()->set(new BrowserKitCookie($name, $value));
                }
            } else {
                $server['HTTP_Authorization'] = 'Bearer ' . $token;
            }
        }

        $this->client->request(
            $method,
            $uri,
            server: $server,
            content: $payload !== null ? json_encode($payload, JSON_THROW_ON_ERROR) : null
        );

        return $this->decodeResponse();
    }

    protected function requestRawWebhook(
        string $uri,
        string $rawBody,
        string $signature,
        string $timestamp,
        string $event
    ): array {
        $this->client->request(
            'POST',
            $uri,
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_WEBHOOK_SIGNATURE' => $signature,
                'HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp,
                'HTTP_X_WEBHOOK_EVENT' => $event,
            ],
            content: $rawBody
        );

        return $this->decodeResponse();
    }

    /**
     * @param array<string, mixed> $fields
     * @param array<string, UploadedFile|array<int, UploadedFile>> $files
     */
    protected function requestMultipart(
        string $method,
        string $uri,
        array $fields = [],
        array $files = [],
        ?string $token = null
    ): array {
        $server = [];
        $this->client->getCookieJar()->clear();

        if ($token !== null) {
            if (str_contains($token, '=')) {
                foreach (explode(';', $token) as $segment) {
                    $segment = trim($segment);
                    if ($segment === '') {
                        continue;
                    }

                    [$name, $value] = array_pad(explode('=', $segment, 2), 2, '');
                    $this->client->getCookieJar()->set(new BrowserKitCookie($name, $value));
                }
            } else {
                $server['HTTP_Authorization'] = 'Bearer ' . $token;
            }
        }

        $this->client->request($method, $uri, $fields, $files, $server);

        return $this->decodeResponse();
    }

    protected function jsonEncode(array $payload): string
    {
        return json_encode($payload, JSON_THROW_ON_ERROR);
    }

    protected function uniqueSuffix(): string
    {
        return bin2hex(random_bytes(8));
    }

    protected function disableExceptionCatching(): void
    {
        $this->client->catchExceptions(false);
    }

    private function buildCookieHeader(KernelBrowser $client): string
    {
        $cookies = $client->getResponse()->headers->getCookies();
        $segments = array_map(
            static fn (Cookie $cookie): string => sprintf('%s=%s', $cookie->getName(), $cookie->getValue()),
            $cookies
        );

        return implode('; ', $segments);
    }

    protected function reloadUserByEmail(string $email): User
    {
        $user = static::getContainer()->get('doctrine')->getRepository(User::class)->findOneBy(['email' => $email]);

        self::assertInstanceOf(User::class, $user);

        return $user;
    }

    private function decodeResponse(): array
    {
        $content = $this->client->getResponse()->getContent();
        if ($content === false || $content === '') {
            return [];
        }

        $decoded = json_decode($content, true);

        return is_array($decoded) ? $decoded : [];
    }
}
