<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Request;

final class OAuthStateService
{
    public function __construct(
        #[Autowire('%kernel.secret%')]
        private readonly string $appSecret,
        #[Autowire('%kernel.environment%')]
        private readonly string $appEnv = 'dev',
        #[Autowire('%env(default::AUTH_COOKIE_DOMAIN)%')]
        private readonly ?string $cookieDomain = null,
        #[Autowire('%env(default::OAUTH_STATE_TTL)%')]
        private readonly ?string $ttlSeconds = null,
    ) {
    }

    /**
     * @param array{provider:string, intent:string, role:?string, next:?string, issued_at:int, expires_at:int, nonce:string} $payload
     */
    public function issue(string $provider, string $intent, ?string $role, ?string $next): array
    {
        $now = time();
        $payload = [
            'provider' => $provider,
            'intent' => $intent,
            'role' => $role,
            'next' => $next,
            'issued_at' => $now,
            'expires_at' => $now + $this->resolveTtlSeconds(),
            'nonce' => bin2hex(random_bytes(16)),
        ];

        return [
            'payload' => $payload,
            'token' => $this->encode($payload),
        ];
    }

    public function buildCookie(string $provider, string $token): Cookie
    {
        return Cookie::create(
            $this->cookieName($provider),
            $token,
            time() + $this->resolveTtlSeconds(),
            '/',
            $this->normalizeCookieDomain(),
            $this->shouldUseSecureCookies(),
            true,
            false,
            Cookie::SAMESITE_LAX,
        );
    }

    public function buildClearingCookie(string $provider): Cookie
    {
        return Cookie::create(
            $this->cookieName($provider),
            '',
            1,
            '/',
            $this->normalizeCookieDomain(),
            $this->shouldUseSecureCookies(),
            true,
            false,
            Cookie::SAMESITE_LAX,
        );
    }

    /**
     * @return array{provider:string, intent:string, role:?string, next:?string, issued_at:int, expires_at:int, nonce:string}
     */
    public function validate(string $provider, ?string $queryState, Request $request): array
    {
        if (!is_string($queryState) || trim($queryState) === '') {
            throw new \DomainException('Missing OAuth state.');
        }

        $cookieState = $request->cookies->get($this->cookieName($provider));
        if (!is_string($cookieState) || $cookieState === '') {
            throw new \DomainException('OAuth state cookie is missing.');
        }

        if (!hash_equals($cookieState, $queryState)) {
            throw new \DomainException('OAuth state does not match.');
        }

        $payload = $this->decode($queryState);
        if (($payload['provider'] ?? null) !== $provider) {
            throw new \DomainException('OAuth provider state mismatch.');
        }

        $expiresAt = $payload['expires_at'] ?? null;
        if (!is_int($expiresAt) || $expiresAt < time()) {
            throw new \DomainException('OAuth state has expired.');
        }

        return $payload;
    }

    private function cookieName(string $provider): string
    {
        return sprintf('wolfix_oauth_%s_state', strtolower($provider));
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function encode(array $payload): string
    {
        $json = json_encode($payload, JSON_THROW_ON_ERROR);
        $body = $this->base64UrlEncode($json);
        $signature = hash_hmac('sha256', $body, $this->appSecret, true);

        return $body . '.' . $this->base64UrlEncode($signature);
    }

    /**
     * @return array{provider:string, intent:string, role:?string, next:?string, issued_at:int, expires_at:int, nonce:string}
     */
    private function decode(string $token): array
    {
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            throw new \DomainException('OAuth state token is invalid.');
        }

        [$body, $signature] = $parts;
        $expectedSignature = $this->base64UrlEncode(hash_hmac('sha256', $body, $this->appSecret, true));
        if (!hash_equals($expectedSignature, $signature)) {
            throw new \DomainException('OAuth state signature is invalid.');
        }

        $decodedBody = $this->base64UrlDecode($body);

        try {
            $payload = json_decode($decodedBody, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            throw new \DomainException('OAuth state payload is invalid.', 0, $exception);
        }

        if (!is_array($payload)) {
            throw new \DomainException('OAuth state payload is invalid.');
        }

        return [
            'provider' => (string) ($payload['provider'] ?? ''),
            'intent' => (string) ($payload['intent'] ?? ''),
            'role' => isset($payload['role']) && is_string($payload['role']) ? $payload['role'] : null,
            'next' => isset($payload['next']) && is_string($payload['next']) ? $payload['next'] : null,
            'issued_at' => (int) ($payload['issued_at'] ?? 0),
            'expires_at' => (int) ($payload['expires_at'] ?? 0),
            'nonce' => (string) ($payload['nonce'] ?? ''),
        ];
    }

    private function shouldUseSecureCookies(): bool
    {
        return !in_array($this->appEnv, ['dev', 'test'], true);
    }

    private function resolveTtlSeconds(): int
    {
        $value = is_string($this->ttlSeconds) ? (int) trim($this->ttlSeconds) : 0;

        return $value > 0 ? $value : 600;
    }

    private function normalizeCookieDomain(): ?string
    {
        $domain = is_string($this->cookieDomain) ? trim($this->cookieDomain) : '';

        return $domain !== '' ? $domain : null;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        $padding = 4 - (strlen($value) % 4);
        if ($padding < 4) {
            $value .= str_repeat('=', $padding);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false) {
            throw new \DomainException('OAuth state could not be decoded.');
        }

        return $decoded;
    }
}
