<?php

declare(strict_types=1);

namespace App\Http;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuthCookies
{
    private const ACCESS_COOKIE = 'wolfix_access_token';
    private const REFRESH_COOKIE = 'wolfix_refresh_token';

    public function __construct(
        #[Autowire('%kernel.environment%')]
        private readonly string $appEnv = 'dev',
        #[Autowire('%env(default::AUTH_COOKIE_DOMAIN)%')]
        private readonly ?string $cookieDomain = null,
        #[Autowire('%env(default::AUTH_COOKIE_SAMESITE)%')]
        private readonly ?string $cookieSameSite = null,
    ) {}

    public function getAccessToken(Request $request): ?string
    {
        $token = $request->cookies->get(self::ACCESS_COOKIE);

        return is_string($token) && $token !== '' ? $token : null;
    }

    public function getRefreshToken(Request $request): ?string
    {
        $token = $request->cookies->get(self::REFRESH_COOKIE);

        return is_string($token) && $token !== '' ? $token : null;
    }

    /**
     * @param array{access_token:string, refresh_token:string, expires_in:int} $tokens
     */
    public function attachSessionCookies(Response $response, array $tokens, int $refreshTtl): Response
    {
        $response->headers->setCookie($this->buildAccessCookie($tokens['access_token'], $tokens['expires_in']));
        $response->headers->setCookie($this->buildRefreshCookie($tokens['refresh_token'], $refreshTtl));

        return $response;
    }

    public function clearSessionCookies(Response $response): Response
    {
        $response->headers->setCookie($this->buildAccessCookie('', -1));
        $response->headers->setCookie($this->buildRefreshCookie('', -1));

        return $response;
    }

    private function buildAccessCookie(string $value, int $ttl): Cookie
    {
        return Cookie::create(
            self::ACCESS_COOKIE,
            $value,
            $ttl < 0 ? 1 : time() + $ttl,
            '/',
            $this->normalizeCookieDomain(),
            $this->shouldUseSecureCookies(),
            true,
            false,
            $this->resolveSameSite()
        );
    }

    private function buildRefreshCookie(string $value, int $ttl): Cookie
    {
        return Cookie::create(
            self::REFRESH_COOKIE,
            $value,
            $ttl < 0 ? 1 : time() + $ttl,
            '/',
            $this->normalizeCookieDomain(),
            $this->shouldUseSecureCookies(),
            true,
            false,
            $this->resolveSameSite()
        );
    }

    private function shouldUseSecureCookies(): bool
    {
        return !in_array($this->appEnv, ['dev', 'test'], true);
    }

    private function normalizeCookieDomain(): ?string
    {
        $domain = is_string($this->cookieDomain) ? trim($this->cookieDomain) : '';

        return $domain !== '' ? $domain : null;
    }

    private function resolveSameSite(): ?string
    {
        $sameSite = strtolower(trim((string) ($this->cookieSameSite ?? '')));

        return match ($sameSite) {
            'lax' => Cookie::SAMESITE_LAX,
            'none' => Cookie::SAMESITE_NONE,
            'strict', '' => Cookie::SAMESITE_STRICT,
            default => Cookie::SAMESITE_STRICT,
        };
    }
}
