<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Double\FakeSocialAuthHttpClient;
use Symfony\Component\HttpFoundation\Response;

final class SocialAuthFlowTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        FakeSocialAuthHttpClient::reset();
    }

    public function testGoogleRegisterFlowCreatesVerifiedVendorAndLogsThemIn(): void
    {
        $this->client->request('GET', '/api/auth/oauth/google/start?intent=register&role=vendor&next=/dashboard/vendor');
        self::assertResponseStatusCodeSame(Response::HTTP_FOUND);

        $redirectUrl = (string) $this->client->getResponse()->headers->get('Location');
        self::assertStringContainsString('https://accounts.google.com/o/oauth2/v2/auth', $redirectUrl);

        parse_str((string) parse_url($redirectUrl, PHP_URL_QUERY), $query);
        $state = $query['state'] ?? null;
        self::assertIsString($state);
        self::assertNotSame('', $state);

        FakeSocialAuthHttpClient::$formResponses['https://oauth2.googleapis.com/token'] = [
            'access_token' => 'google-access-token',
            'token_type' => 'Bearer',
        ];
        FakeSocialAuthHttpClient::$jsonResponses['https://openidconnect.googleapis.com/v1/userinfo'] = [
            'sub' => 'google-user-123',
            'email' => 'vendor_google@test.com',
            'email_verified' => true,
            'name' => 'Vendor Google',
        ];

        $this->client->request('GET', '/api/auth/oauth/google/callback?code=test-google-code&state=' . urlencode($state));
        self::assertResponseStatusCodeSame(Response::HTTP_FOUND);
        self::assertSame('http://localhost:3000/dashboard/vendor', $this->client->getResponse()->headers->get('Location'));

        $cookieNames = array_map(
            static fn ($cookie): string => $cookie->getName(),
            $this->client->getResponse()->headers->getCookies()
        );
        self::assertContains('wolfix_access_token', $cookieNames);
        self::assertContains('wolfix_refresh_token', $cookieNames);

        $user = $this->reloadUserByEmail('vendor_google@test.com');
        self::assertTrue($user->isVerified());
        self::assertContains('ROLE_VENDOR', $user->getRoles());
        self::assertSame('google-user-123', $user->getGoogleId());
        self::assertNotNull($user->getVendorProfile());

        $this->client->request('GET', '/api/protected/me');
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        $payload = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('vendor_google@test.com', $payload['email'] ?? null);
    }

    public function testGithubLoginLinksExistingVerifiedAccountByEmail(): void
    {
        $password = 'Password123!';
        $registration = $this->registerUser('client_github@test.com', $password, 'client');
        $this->verifyUser($registration['verification_url']);

        $this->client->request('GET', '/api/auth/oauth/github/start?intent=login');
        self::assertResponseStatusCodeSame(Response::HTTP_FOUND);

        $redirectUrl = (string) $this->client->getResponse()->headers->get('Location');
        self::assertStringContainsString('https://github.com/login/oauth/authorize', $redirectUrl);

        parse_str((string) parse_url($redirectUrl, PHP_URL_QUERY), $query);
        $state = $query['state'] ?? null;
        self::assertIsString($state);
        self::assertNotSame('', $state);

        FakeSocialAuthHttpClient::$formResponses['https://github.com/login/oauth/access_token'] = [
            'access_token' => 'github-access-token',
            'token_type' => 'bearer',
        ];
        FakeSocialAuthHttpClient::$jsonResponses['https://api.github.com/user'] = [
            'id' => 987654,
            'login' => 'octotest',
            'name' => 'Octo Test',
        ];
        FakeSocialAuthHttpClient::$jsonResponses['https://api.github.com/user/emails'] = [
            [
                'email' => 'client_github@test.com',
                'primary' => true,
                'verified' => true,
            ],
        ];

        $this->client->request('GET', '/api/auth/oauth/github/callback?code=test-github-code&state=' . urlencode($state));
        self::assertResponseStatusCodeSame(Response::HTTP_FOUND);
        self::assertSame('http://localhost:3000/dashboard', $this->client->getResponse()->headers->get('Location'));

        $user = $this->reloadUserByEmail('client_github@test.com');
        self::assertSame('987654', $user->getGithubId());
        self::assertTrue($user->isVerified());
        self::assertNotContains('ROLE_VENDOR', $user->getRoles());

        $this->client->request('GET', '/api/protected/me');
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        $payload = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('client_github@test.com', $payload['email'] ?? null);
    }

    public function testGoogleLoginRequiresRoleSelectionBeforeCreatingNewAccount(): void
    {
        $this->client->request('GET', '/api/auth/oauth/google/start?intent=login');
        self::assertResponseStatusCodeSame(Response::HTTP_FOUND);

        $redirectUrl = (string) $this->client->getResponse()->headers->get('Location');
        self::assertStringContainsString('https://accounts.google.com/o/oauth2/v2/auth', $redirectUrl);

        parse_str((string) parse_url($redirectUrl, PHP_URL_QUERY), $query);
        $state = $query['state'] ?? null;
        self::assertIsString($state);
        self::assertNotSame('', $state);

        FakeSocialAuthHttpClient::$formResponses['https://oauth2.googleapis.com/token'] = [
            'access_token' => 'google-access-token',
            'token_type' => 'Bearer',
        ];
        FakeSocialAuthHttpClient::$jsonResponses['https://openidconnect.googleapis.com/v1/userinfo'] = [
            'sub' => 'google-new-user-456',
            'email' => 'new_google_login@test.com',
            'email_verified' => true,
            'name' => 'New Google Login',
        ];

        $this->client->request('GET', '/api/auth/oauth/google/callback?code=test-google-code&state=' . urlencode($state));
        self::assertResponseStatusCodeSame(Response::HTTP_FOUND);
        self::assertSame(
            'http://localhost:3000/register?reason=social-role-required&provider=google&email=new_google_login%40test.com',
            $this->client->getResponse()->headers->get('Location')
        );

        self::assertFalse(
            (bool) $this->db->fetchOne(
                'SELECT 1 FROM user WHERE email = :email LIMIT 1',
                ['email' => 'new_google_login@test.com']
            )
        );
    }
}
