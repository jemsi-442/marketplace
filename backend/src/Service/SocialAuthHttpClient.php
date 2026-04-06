<?php

declare(strict_types=1);

namespace App\Service;

class SocialAuthHttpClient
{
    /**
     * @param array<string, scalar|bool|null> $fields
     * @param array<int, string> $headers
     * @return array<string, mixed>
     */
    public function postForm(string $url, array $fields, array $headers = []): array
    {
        $payload = http_build_query($fields, '', '&', PHP_QUERY_RFC3986);

        return $this->request($url, 'POST', [
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json',
            ...$headers,
        ], $payload);
    }

    /**
     * @param array<int, string> $headers
     * @return array<string, mixed>
     */
    public function getJson(string $url, array $headers = []): array
    {
        return $this->request($url, 'GET', [
            'Accept: application/json',
            ...$headers,
        ]);
    }

    /**
     * @param array<int, string> $headers
     * @return array<string, mixed>
     */
    protected function request(string $url, string $method, array $headers = [], ?string $body = null): array
    {
        $ch = curl_init($url);

        if ($ch === false) {
            throw new \RuntimeException('Unable to initialize OAuth HTTP request.');
        }

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_FOLLOWLOCATION => false,
        ]);

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $rawResponse = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error !== '') {
            throw new \RuntimeException('OAuth request failed: ' . $error);
        }

        if (!is_string($rawResponse) || $rawResponse === '') {
            throw new \RuntimeException('OAuth provider returned an empty response.');
        }

        try {
            $decoded = json_decode($rawResponse, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            throw new \RuntimeException('OAuth provider returned invalid JSON.', 0, $exception);
        }

        if (!is_array($decoded)) {
            throw new \RuntimeException('OAuth provider returned an unexpected payload.');
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            $message = $decoded['error_description'] ?? $decoded['error'] ?? 'OAuth request failed.';
            if (!is_string($message) || trim($message) === '') {
                $message = 'OAuth request failed.';
            }

            throw new \RuntimeException(sprintf('%s (HTTP %d)', trim($message), $httpCode));
        }

        return $decoded;
    }
}
