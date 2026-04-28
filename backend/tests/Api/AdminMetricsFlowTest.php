<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Symfony\Component\HttpFoundation\Response;

final class AdminMetricsFlowTest extends ApiTestCase
{
    public function testAdminCanReadOpsOverview(): void
    {
        $email = 'admin-metrics@example.com';
        $password = 'Password123!';

        $registration = $this->registerUser($email, $password, 'client');
        $this->verifyUser($registration['verification_url']);
        $this->promoteUserToAdmin($email);
        $this->loginUser($email, $password);

        $this->client->request('GET', '/api/admin/metrics/ops-overview');

        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $data = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertIsString($data['app_env'] ?? null);
        self::assertNotSame('', $data['app_env'] ?? null);
        self::assertTrue((bool) ($data['request_tracing']['enabled'] ?? false));
        self::assertIsArray($data['object_storage'] ?? null);
        self::assertSame('local', $data['object_storage']['driver'] ?? null);
        self::assertArrayHasKey('status', $data['object_storage']);
        self::assertIsArray($data['metrics_pipeline'] ?? null);
        self::assertIsArray($data['upload_scanning'] ?? null);
        self::assertArrayHasKey('status', $data['upload_scanning']);
        self::assertArrayHasKey('message', $data['upload_scanning']);
    }
}
