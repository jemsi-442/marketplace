<?php

declare(strict_types=1);

namespace App\Tests\Double;

use App\Service\SocialAuthHttpClient;

final class FakeSocialAuthHttpClient extends SocialAuthHttpClient
{
    /** @var array<string, array<string, mixed>> */
    public static array $formResponses = [];

    /** @var array<string, mixed> */
    public static array $jsonResponses = [];

    /** @var array<int, array{method:string, url:string}> */
    public static array $requests = [];

    public static function reset(): void
    {
        self::$formResponses = [];
        self::$jsonResponses = [];
        self::$requests = [];
    }

    public function postForm(string $url, array $fields, array $headers = []): array
    {
        self::$requests[] = [
            'method' => 'POST',
            'url' => $url,
        ];

        if (!array_key_exists($url, self::$formResponses)) {
            throw new \RuntimeException('Missing fake OAuth form response for ' . $url);
        }

        return self::$formResponses[$url];
    }

    public function getJson(string $url, array $headers = []): array
    {
        self::$requests[] = [
            'method' => 'GET',
            'url' => $url,
        ];

        if (!array_key_exists($url, self::$jsonResponses)) {
            throw new \RuntimeException('Missing fake OAuth JSON response for ' . $url);
        }

        $payload = self::$jsonResponses[$url];

        if (!is_array($payload)) {
            throw new \RuntimeException('Fake OAuth response must be an array.');
        }

        return $payload;
    }
}
