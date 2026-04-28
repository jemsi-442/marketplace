<?php

declare(strict_types=1);

namespace App\Service;

final class SignedObjectTransferTokenService
{
    public function __construct(private readonly string $appSecret)
    {
    }

    /**
     * @param array<string, scalar|null> $payload
     * @return array{expires: int, signature: string}
     */
    public function issue(string $scope, string $resourceKey, array $payload, int $ttlSeconds = 300): array
    {
        $expires = time() + max(60, $ttlSeconds);

        return [
            'expires' => $expires,
            'signature' => $this->sign($scope, $resourceKey, $payload, $expires),
        ];
    }

    /**
     * @param array<string, scalar|null> $payload
     */
    public function isValid(string $scope, string $resourceKey, array $payload, int $expires, ?string $signature): bool
    {
        if ($signature === null || trim($signature) === '' || $expires < time()) {
            return false;
        }

        return hash_equals($this->sign($scope, $resourceKey, $payload, $expires), trim($signature));
    }

    /**
     * @param array<string, scalar|null> $payload
     */
    private function sign(string $scope, string $resourceKey, array $payload, int $expires): string
    {
        ksort($payload);

        return hash_hmac(
            'sha256',
            sprintf('%s|%s|%d|%s', $scope, $resourceKey, $expires, json_encode($payload, JSON_THROW_ON_ERROR)),
            $this->appSecret
        );
    }
}
