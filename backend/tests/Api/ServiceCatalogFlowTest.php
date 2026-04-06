<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Symfony\Component\HttpFoundation\Response;

final class ServiceCatalogFlowTest extends ApiTestCase
{
    public function testServiceGroupsAndGroupScopedFiltersReturnStructuredCatalogData(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("service_catalog_client_{$suffix}@test.com", $password, 'client');
        $this->verifyUser($clientRegistration['verification_url']);
        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);

        $groups = $this->requestJson('GET', '/api/service-types/groups', null, $clientLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertNotEmpty($groups);

        $slugs = array_column($groups, 'slug');
        self::assertContains('software-development', $slugs);
        self::assertContains('design-creative', $slugs);
        self::assertContains('social-media-marketing', $slugs);
        self::assertContains('cybersecurity-infrastructure', $slugs);
        self::assertContains('government-consultancy', $slugs);
        self::assertContains('automation-operations', $slugs);

        $softwareGroup = $this->findGroup($groups, 'software-development');
        self::assertNotNull($softwareGroup);
        self::assertGreaterThan(0, $softwareGroup['service_count'] ?? 0);
        self::assertContains('Payment Gateway Integration', $softwareGroup['featured_services'] ?? []);

        $socialServices = $this->requestJson(
            'GET',
            '/api/service-types?group=social-media-marketing&search=instagram',
            null,
            $clientLogin['token']
        );
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertNotEmpty($socialServices);
        self::assertSame('Instagram Management', $socialServices[0]['name'] ?? null);
        self::assertSame('social-media-marketing', $socialServices[0]['group_slug'] ?? null);

        $designServices = $this->requestJson(
            'GET',
            '/api/service-types?group=design-creative&category=Graphic%20Design',
            null,
            $clientLogin['token']
        );
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertNotEmpty($designServices);
        self::assertContains('Graphic Design', array_column($designServices, 'name'));
        self::assertContains('Social Media Creative Design', array_column($designServices, 'name'));
        self::assertSame(['design-creative'], array_values(array_unique(array_column($designServices, 'group_slug'))));

        $governmentServices = $this->requestJson(
            'GET',
            '/api/service-types?group=government-consultancy&search=tender',
            null,
            $clientLogin['token']
        );
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertCount(1, $governmentServices);
        self::assertSame('Tender Documentation Support', $governmentServices[0]['name'] ?? null);
        self::assertSame('government-consultancy', $governmentServices[0]['group_slug'] ?? null);
    }

    /**
     * @param array<int, array<string, mixed>> $groups
     *
     * @return array<string, mixed>|null
     */
    private function findGroup(array $groups, string $slug): ?array
    {
        foreach ($groups as $group) {
            if (($group['slug'] ?? null) === $slug) {
                return $group;
            }
        }

        return null;
    }
}
