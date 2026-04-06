<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Entity\VendorProfile;
use App\Exception\Domain\SocialRoleSelectionRequiredException;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class SocialAuthService
{
    public function __construct(
        private readonly SocialAuthHttpClient $httpClient,
        private readonly UserRepository $users,
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
        private readonly AuthService $auth,
        #[Autowire('%env(default::GOOGLE_OAUTH_CLIENT_ID)%')]
        private readonly ?string $googleClientId = null,
        #[Autowire('%env(default::GOOGLE_OAUTH_CLIENT_SECRET)%')]
        private readonly ?string $googleClientSecret = null,
        #[Autowire('%env(default::GITHUB_OAUTH_CLIENT_ID)%')]
        private readonly ?string $githubClientId = null,
        #[Autowire('%env(default::GITHUB_OAUTH_CLIENT_SECRET)%')]
        private readonly ?string $githubClientSecret = null,
        #[Autowire('%env(default::OAUTH_PUBLIC_API_BASE_URL)%')]
        private readonly ?string $oauthPublicApiBaseUrl = null,
        #[Autowire('%env(default::FRONTEND_PUBLIC_URL)%')]
        private readonly ?string $frontendPublicUrl = null,
    ) {
    }

    public function buildAuthorizationUrl(string $provider, string $state): string
    {
        $config = $this->providerConfig($provider);
        $query = [
            'client_id' => $config['client_id'],
            'redirect_uri' => $this->callbackUrl($provider),
            'state' => $state,
        ];

        if ($provider === 'google') {
            $query['response_type'] = 'code';
            $query['scope'] = 'openid email profile';
            $query['access_type'] = 'offline';
            $query['prompt'] = 'select_account';
        } else {
            $query['scope'] = 'read:user user:email';
            $query['allow_signup'] = 'true';
        }

        return $config['authorize_url'] . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * @return array{session: array<string, mixed>, user: User}
     */
    public function authenticate(string $provider, string $code, ?string $roleHint = null): array
    {
        $config = $this->providerConfig($provider);
        $tokenPayload = $this->httpClient->postForm($config['token_url'], [
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'code' => $code,
            'redirect_uri' => $this->callbackUrl($provider),
            'grant_type' => 'authorization_code',
        ], $provider === 'github' ? ['Accept: application/json'] : []);

        $accessToken = $tokenPayload['access_token'] ?? null;
        if (!is_string($accessToken) || trim($accessToken) === '') {
            throw new \DomainException('OAuth provider did not return an access token.');
        }

        $profile = $provider === 'google'
            ? $this->fetchGoogleProfile($accessToken)
            : $this->fetchGitHubProfile($accessToken);

        $user = $this->findOrCreateUser($provider, $profile, $roleHint);

        if ($user->isLocked()) {
            throw new \DomainException('Account is locked');
        }

        return [
            'session' => $this->auth->login($user),
            'user' => $user,
        ];
    }

    public function successRedirectPath(string $intent, ?string $role, ?string $next): string
    {
        $safeNext = $this->sanitizeNextPath($next);
        if ($safeNext !== null) {
            return $safeNext;
        }

        if ($intent === 'register') {
            return $role === 'vendor' ? '/dashboard/vendor' : '/dashboard/client';
        }

        return '/dashboard';
    }

    public function failureRedirectUrl(string $provider, string $message = 'social-auth-failed'): string
    {
        $query = http_build_query([
            'reason' => $message,
            'provider' => $provider,
        ], '', '&', PHP_QUERY_RFC3986);

        return $this->frontendUrl('/login?' . $query);
    }

    public function roleSelectionRedirectUrl(string $provider, string $email): string
    {
        $query = http_build_query([
            'reason' => 'social-role-required',
            'provider' => $provider,
            'email' => $email,
        ], '', '&', PHP_QUERY_RFC3986);

        return $this->frontendUrl('/register?' . $query);
    }

    public function frontendUrl(string $path): string
    {
        $base = rtrim($this->requireFrontendBaseUrl(), '/');
        $normalizedPath = '/' . ltrim($path, '/');

        return $base . $normalizedPath;
    }

    private function callbackUrl(string $provider): string
    {
        $base = rtrim($this->requireOauthPublicApiBaseUrl(), '/');

        return sprintf('%s/api/auth/oauth/%s/callback', $base, $provider);
    }

    /**
     * @return array{provider_id:string, email:string, email_verified:bool, name:?string}
     */
    private function fetchGoogleProfile(string $accessToken): array
    {
        $payload = $this->httpClient->getJson('https://openidconnect.googleapis.com/v1/userinfo', [
            'Authorization: Bearer ' . $accessToken,
        ]);

        $providerId = $payload['sub'] ?? null;
        $email = $payload['email'] ?? null;
        $emailVerified = $payload['email_verified'] ?? false;
        $name = $payload['name'] ?? null;

        if (!is_string($providerId) || !is_string($email) || trim($email) === '') {
            throw new \DomainException('Google did not return a usable account identity.');
        }

        return [
            'provider_id' => $providerId,
            'email' => strtolower(trim($email)),
            'email_verified' => filter_var($emailVerified, FILTER_VALIDATE_BOOL),
            'name' => is_string($name) && trim($name) !== '' ? trim($name) : null,
        ];
    }

    /**
     * @return array{provider_id:string, email:string, email_verified:bool, name:?string}
     */
    private function fetchGitHubProfile(string $accessToken): array
    {
        $headers = [
            'Authorization: Bearer ' . $accessToken,
            'User-Agent: WOLFIX-Marketplace',
            'Accept: application/vnd.github+json',
        ];

        $profile = $this->httpClient->getJson('https://api.github.com/user', $headers);
        $emails = $this->httpClient->getJson('https://api.github.com/user/emails', $headers);

        $providerId = $profile['id'] ?? null;
        $name = $profile['name'] ?? ($profile['login'] ?? null);
        $emailRecord = $this->resolveGitHubEmail($emails);

        if ((!is_string($providerId) && !is_int($providerId)) || $emailRecord === null) {
            throw new \DomainException('GitHub account needs a verified primary email address.');
        }

        return [
            'provider_id' => (string) $providerId,
            'email' => strtolower($emailRecord['email']),
            'email_verified' => true,
            'name' => is_string($name) && trim($name) !== '' ? trim($name) : null,
        ];
    }

    /**
     * @param mixed $emails
     * @return array{email:string}|null
     */
    private function resolveGitHubEmail(mixed $emails): ?array
    {
        if (!is_array($emails)) {
            return null;
        }

        $fallback = null;
        foreach ($emails as $row) {
            if (!is_array($row)) {
                continue;
            }

            $email = $row['email'] ?? null;
            $verified = $row['verified'] ?? false;
            $primary = $row['primary'] ?? false;
            if (!is_string($email) || trim($email) === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }

            if (filter_var($verified, FILTER_VALIDATE_BOOL) && filter_var($primary, FILTER_VALIDATE_BOOL)) {
                return ['email' => $email];
            }

            if ($fallback === null && filter_var($verified, FILTER_VALIDATE_BOOL)) {
                $fallback = ['email' => $email];
            }
        }

        return $fallback;
    }

    /**
     * @param array{provider_id:string, email:string, email_verified:bool, name:?string} $profile
     */
    private function findOrCreateUser(string $provider, array $profile, ?string $roleHint): User
    {
        $providerField = $provider === 'google' ? 'googleId' : 'githubId';
        $providerSetter = $provider === 'google' ? 'setGoogleId' : 'setGithubId';

        $user = $this->users->findOneBy([$providerField => $profile['provider_id']]);

        if (!$user) {
            $user = $this->users->findOneBy(['email' => $profile['email']]);
        }

        if (!$user) {
            if ($roleHint === null) {
                throw new SocialRoleSelectionRequiredException($provider, $profile['email']);
            }

            $user = new User();
            $user->setEmail($profile['email']);
            $user->setRoles([$this->normalizeRole($roleHint)]);
            $user->setPassword($this->hasher->hashPassword($user, bin2hex(random_bytes(24)) . 'Aa1!'));
            $this->em->persist($user);
        }

        if (method_exists($user, $providerSetter)) {
            $user->{$providerSetter}($profile['provider_id']);
        }

        if ($profile['email_verified']) {
            $user->setIsVerified(true);
        }

        if ($roleHint === 'vendor' && !in_array('ROLE_VENDOR', $user->getRoles(), true)) {
            $roles = $user->getRoles();
            $roles[] = 'ROLE_VENDOR';
            $user->setRoles($roles);
        }

        $this->ensureVendorProfile($user, $profile['name']);
        $this->em->flush();

        return $user;
    }

    private function ensureVendorProfile(User $user, ?string $name): void
    {
        if (!in_array('ROLE_VENDOR', $user->getRoles(), true) || $user->getVendorProfile() !== null) {
            return;
        }

        $companyName = $name !== null && trim($name) !== ''
            ? mb_substr($name, 0, 255)
            : sprintf('Vendor %s', $user->getId() ?? $user->getEmail());

        $vendorProfile = new VendorProfile();
        $vendorProfile->setUser($user);
        $vendorProfile->setCompanyName($companyName);
        $this->em->persist($vendorProfile);
    }

    private function normalizeRole(?string $roleHint): string
    {
        return $roleHint === 'vendor' ? 'ROLE_VENDOR' : 'ROLE_USER';
    }

    /**
     * @return array{client_id:string, client_secret:string, authorize_url:string, token_url:string}
     */
    private function providerConfig(string $provider): array
    {
        $normalizedProvider = strtolower(trim($provider));

        return match ($normalizedProvider) {
            'google' => $this->validatedConfig(
                $normalizedProvider,
                $this->googleClientId,
                $this->googleClientSecret,
                'https://accounts.google.com/o/oauth2/v2/auth',
                'https://oauth2.googleapis.com/token',
            ),
            'github' => $this->validatedConfig(
                $normalizedProvider,
                $this->githubClientId,
                $this->githubClientSecret,
                'https://github.com/login/oauth/authorize',
                'https://github.com/login/oauth/access_token',
            ),
            default => throw new \DomainException('Unsupported social auth provider.'),
        };
    }

    /**
     * @return array{client_id:string, client_secret:string, authorize_url:string, token_url:string}
     */
    private function validatedConfig(
        string $provider,
        ?string $clientId,
        ?string $clientSecret,
        string $authorizeUrl,
        string $tokenUrl,
    ): array {
        $normalizedClientId = is_string($clientId) ? trim($clientId) : '';
        $normalizedClientSecret = is_string($clientSecret) ? trim($clientSecret) : '';

        if ($normalizedClientId === '' || $normalizedClientSecret === '') {
            throw new \DomainException(ucfirst($provider) . ' sign-in is not configured yet.');
        }

        return [
            'client_id' => $normalizedClientId,
            'client_secret' => $normalizedClientSecret,
            'authorize_url' => $authorizeUrl,
            'token_url' => $tokenUrl,
        ];
    }

    private function requireOauthPublicApiBaseUrl(): string
    {
        $value = is_string($this->oauthPublicApiBaseUrl) ? trim($this->oauthPublicApiBaseUrl) : '';

        return $value !== '' ? $value : 'http://localhost:3000/backend-api';
    }

    private function requireFrontendBaseUrl(): string
    {
        $value = is_string($this->frontendPublicUrl) ? trim($this->frontendPublicUrl) : '';

        return $value !== '' ? $value : 'http://localhost:3000';
    }

    private function sanitizeNextPath(?string $next): ?string
    {
        if (!is_string($next)) {
            return null;
        }

        $trimmed = trim($next);
        if ($trimmed === '' || !str_starts_with($trimmed, '/dashboard') || str_starts_with($trimmed, '//')) {
            return null;
        }

        return $trimmed;
    }
}
