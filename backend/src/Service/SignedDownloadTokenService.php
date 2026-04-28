<?php

declare(strict_types=1);

namespace App\Service;

final class SignedDownloadTokenService
{
    public function __construct(private readonly string $appSecret)
    {
    }

    /**
     * @return array{expires: int, signature: string}
     */
    public function issue(string $scope, string $resourceKey, int $ttlSeconds = 300): array
    {
        $expires = time() + max(60, $ttlSeconds);

        return [
            'expires' => $expires,
            'signature' => $this->sign($scope, $resourceKey, $expires),
        ];
    }

    public function isValid(string $scope, string $resourceKey, int $expires, ?string $signature): bool
    {
        if ($signature === null || trim($signature) === '' || $expires < time()) {
            return false;
        }

        return hash_equals($this->sign($scope, $resourceKey, $expires), trim($signature));
    }

    private function sign(string $scope, string $resourceKey, int $expires): string
    {
        return hash_hmac('sha256', sprintf('%s|%s|%d', $scope, $resourceKey, $expires), $this->appSecret);
    }
}
