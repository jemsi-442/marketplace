<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\User;
use Doctrine\DBAL\Connection;
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

        if ($token !== null) {
            $server['HTTP_Authorization'] = 'Bearer ' . $token;
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

    protected function jsonEncode(array $payload): string
    {
        return json_encode($payload, JSON_THROW_ON_ERROR);
    }

    protected function uniqueSuffix(): string
    {
        return bin2hex(random_bytes(8));
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
