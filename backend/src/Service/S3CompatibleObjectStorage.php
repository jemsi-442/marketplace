<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class S3CompatibleObjectStorage implements ObjectStorageInterface
{
    private const SERVICE_NAME = 's3';

    private readonly ?\Closure $transport;

    public function __construct(
        private readonly string $driver,
        private readonly ?string $bucket,
        private readonly ?string $region,
        private readonly ?string $endpoint,
        private readonly ?string $accessKey,
        private readonly ?string $secretKey,
        private readonly bool $pathStyle,
        ?\Closure $transport = null,
    ) {
        $this->transport = $transport;
    }

    public function isConfigured(): bool
    {
        return $this->missingConfigurationKeys() === [];
    }

    /**
     * @return list<string>
     */
    public function getConfiguredKeys(): array
    {
        return array_keys(array_filter([
            'bucket' => $this->bucket,
            'region' => $this->region,
            'endpoint' => $this->endpoint,
            'access_key' => $this->accessKey,
            'secret_key' => $this->secretKey,
        ], static fn (?string $value): bool => is_string($value) && trim($value) !== ''));
    }

    public function storeUploadedFile(UploadedFile $file, string $rootDir, string $objectPrefix, string $storedName): string
    {
        $this->assertConfigured();

        $realPath = $file->getRealPath();
        if (!is_string($realPath) || $realPath === '' || !is_file($realPath)) {
            throw new \RuntimeException('The uploaded file could not be read for remote object storage.');
        }

        $objectKey = $this->buildObjectKey($objectPrefix, $storedName);
        $body = file_get_contents($realPath);
        if (!is_string($body)) {
            throw new \RuntimeException('The uploaded file could not be loaded into memory for remote object storage.');
        }

        $contentType = $file->getClientMimeType();
        if ((!is_string($contentType) || trim($contentType) === '') && method_exists($file, 'getClientOriginalExtension')) {
            $contentType = null;
        }
        $headers = [];
        if (is_string($contentType) && trim($contentType) !== '') {
            $headers['content-type'] = trim($contentType);
        }

        $response = $this->sendSignedRequest('PUT', $objectKey, $body, $headers);
        if ($response['status_code'] < 200 || $response['status_code'] >= 300) {
            throw new \RuntimeException(sprintf(
                'Remote object storage upload failed with status %d.',
                $response['status_code']
            ));
        }

        return $objectKey;
    }

    public function createTemporaryUploadLink(string $objectPrefix, string $storedName, ?string $contentType = null, int $ttlSeconds = 300): ?array
    {
        $this->assertConfigured();

        $ttl = max(60, min($ttlSeconds, 604800));
        $objectKey = $this->buildObjectKey($objectPrefix, $storedName);
        $bucket = $this->requireTrimmed($this->bucket, 'bucket');
        $region = $this->requireTrimmed($this->region, 'region');
        $accessKey = $this->requireTrimmed($this->accessKey, 'access_key');
        $secretKey = $this->requireTrimmed($this->secretKey, 'secret_key');

        $target = $this->buildRequestTarget($bucket, $region, $objectKey);
        $timestamp = gmdate('Ymd\THis\Z');
        $date = substr($timestamp, 0, 8);
        $expires = time() + $ttl;
        $credentialScope = sprintf('%s/%s/%s/aws4_request', $date, $region, self::SERVICE_NAME);

        $signedHeaders = ['host'];
        $headers = [];
        if (is_string($contentType) && trim($contentType) !== '') {
            $headers['Content-Type'] = trim($contentType);
            $signedHeaders[] = 'content-type';
        }

        sort($signedHeaders);

        $query = [
            'X-Amz-Algorithm' => 'AWS4-HMAC-SHA256',
            'X-Amz-Credential' => $accessKey . '/' . $credentialScope,
            'X-Amz-Date' => $timestamp,
            'X-Amz-Expires' => (string) $ttl,
            'X-Amz-SignedHeaders' => implode(';', $signedHeaders),
        ];

        $canonicalHeaders = 'host:' . $target['host'] . "\n";
        if (isset($headers['Content-Type'])) {
            $canonicalHeaders .= 'content-type:' . preg_replace('/\s+/', ' ', trim($headers['Content-Type'])) . "\n";
        }

        $canonicalRequest = implode("\n", [
            'PUT',
            $target['canonical_uri'],
            $this->buildCanonicalQuery($query),
            $canonicalHeaders,
            implode(';', $signedHeaders),
            'UNSIGNED-PAYLOAD',
        ]);

        $stringToSign = implode("\n", [
            'AWS4-HMAC-SHA256',
            $timestamp,
            $credentialScope,
            hash('sha256', $canonicalRequest),
        ]);

        $signature = hash_hmac('sha256', $stringToSign, $this->buildSigningKey($secretKey, $date, $region));
        $query['X-Amz-Signature'] = $signature;

        return [
            'url' => $target['url'] . '?' . $this->buildCanonicalQuery($query),
            'method' => 'PUT',
            'headers' => $headers,
            'expires' => $expires,
            'storage_path' => $objectKey,
        ];
    }

    public function createTemporaryDownloadLink(?string $storagePath, int $ttlSeconds = 300): ?array
    {
        if ($storagePath === null || trim($storagePath) === '') {
            return null;
        }

        $this->assertConfigured();

        $ttl = max(60, min($ttlSeconds, 604800));
        $objectKey = trim($storagePath);
        $bucket = $this->requireTrimmed($this->bucket, 'bucket');
        $region = $this->requireTrimmed($this->region, 'region');
        $accessKey = $this->requireTrimmed($this->accessKey, 'access_key');
        $secretKey = $this->requireTrimmed($this->secretKey, 'secret_key');

        $target = $this->buildRequestTarget($bucket, $region, $objectKey);
        $timestamp = gmdate('Ymd\THis\Z');
        $date = substr($timestamp, 0, 8);
        $expires = time() + $ttl;
        $credentialScope = sprintf('%s/%s/%s/aws4_request', $date, $region, self::SERVICE_NAME);

        $query = [
            'X-Amz-Algorithm' => 'AWS4-HMAC-SHA256',
            'X-Amz-Credential' => $accessKey . '/' . $credentialScope,
            'X-Amz-Date' => $timestamp,
            'X-Amz-Expires' => (string) $ttl,
            'X-Amz-SignedHeaders' => 'host',
        ];
        ksort($query);

        $canonicalQuery = $this->buildCanonicalQuery($query);
        $canonicalRequest = implode("\n", [
            'GET',
            $target['canonical_uri'],
            $canonicalQuery,
            'host:' . $target['host'] . "\n",
            'host',
            'UNSIGNED-PAYLOAD',
        ]);

        $stringToSign = implode("\n", [
            'AWS4-HMAC-SHA256',
            $timestamp,
            $credentialScope,
            hash('sha256', $canonicalRequest),
        ]);

        $signature = hash_hmac('sha256', $stringToSign, $this->buildSigningKey($secretKey, $date, $region));
        $query['X-Amz-Signature'] = $signature;

        return [
            'url' => $target['url'] . '?' . $this->buildCanonicalQuery($query),
            'expires' => $expires,
        ];
    }

    /**
     * @param list<string> $rootDirs
     */
    public function resolveStoredPath(?string $storagePath, array $rootDirs): ?string
    {
        if ($storagePath === null || trim($storagePath) === '') {
            return null;
        }

        $this->assertConfigured();

        $cachePath = $this->buildCachePath($storagePath);
        if (is_file($cachePath) && filesize($cachePath) !== false && filesize($cachePath) > 0) {
            return $cachePath;
        }

        $response = $this->sendSignedRequest('GET', trim($storagePath), null);
        if ($response['status_code'] === 404) {
            return null;
        }

        if ($response['status_code'] < 200 || $response['status_code'] >= 300) {
            throw new \RuntimeException(sprintf(
                'Remote object storage download failed with status %d.',
                $response['status_code']
            ));
        }

        $cacheDir = dirname($cachePath);
        if (!is_dir($cacheDir) && !mkdir($cacheDir, 0775, true) && !is_dir($cacheDir)) {
            throw new \RuntimeException('Could not prepare the remote object cache directory.');
        }

        if (file_put_contents($cachePath, $response['body']) === false) {
            throw new \RuntimeException('Could not write the remote object into the local cache.');
        }

        return $cachePath;
    }

    /**
     * @param list<string> $rootDirs
     */
    public function removeStoredPath(?string $storagePath, array $rootDirs, ?string $cleanupRootDir = null): void
    {
        if ($storagePath === null || trim($storagePath) === '') {
            return;
        }

        $this->assertConfigured();

        $response = $this->sendSignedRequest('DELETE', trim($storagePath), null);
        if (!in_array($response['status_code'], [200, 202, 204, 404], true)) {
            throw new \RuntimeException(sprintf(
                'Remote object storage delete failed with status %d.',
                $response['status_code']
            ));
        }

        $cachePath = $this->buildCachePath($storagePath);
        if (is_file($cachePath)) {
            @unlink($cachePath);
        }
    }

    /**
     * @param array<string, string> $headers
     * @return array{status_code: int, body: string}
     */
    private function sendSignedRequest(string $method, string $objectKey, ?string $body, array $headers = []): array
    {
        $request = $this->buildSignedRequest($method, $objectKey, $body, $headers);

        if ($this->transport instanceof \Closure) {
            $response = ($this->transport)($request['method'], $request['url'], $request['headers'], $request['body']);
            if (!is_array($response) || !isset($response['status_code']) || !isset($response['body'])) {
                throw new \RuntimeException('The custom S3 transport returned an invalid response payload.');
            }

            return [
                'status_code' => (int) $response['status_code'],
                'body' => (string) $response['body'],
            ];
        }

        if (!function_exists('curl_init')) {
            throw new \RuntimeException('The curl extension is required for S3-compatible object storage.');
        }

        $handle = curl_init($request['url']);
        if ($handle === false) {
            throw new \RuntimeException('The S3-compatible object storage request could not be initialized.');
        }

        $flattenedHeaders = [];
        foreach ($request['headers'] as $name => $value) {
            $flattenedHeaders[] = sprintf('%s: %s', $this->formatHeaderName($name), $value);
        }

        curl_setopt_array($handle, [
            CURLOPT_CUSTOMREQUEST => $request['method'],
            CURLOPT_HTTPHEADER => $flattenedHeaders,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_TIMEOUT => 45,
        ]);

        if ($request['body'] !== null) {
            curl_setopt($handle, CURLOPT_POSTFIELDS, $request['body']);
        }

        $responseBody = curl_exec($handle);
        $statusCode = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);

        if ($responseBody === false) {
            $error = curl_error($handle);
            curl_close($handle);

            throw new \RuntimeException(sprintf(
                'The S3-compatible object storage request failed: %s',
                $error !== '' ? $error : 'unknown transport error'
            ));
        }

        curl_close($handle);

        return [
            'status_code' => $statusCode,
            'body' => $responseBody,
        ];
    }

    /**
     * @param array<string, string> $extraHeaders
     * @return array{method: string, url: string, headers: array<string, string>, body: ?string}
     */
    private function buildSignedRequest(string $method, string $objectKey, ?string $body, array $extraHeaders = []): array
    {
        $bucket = $this->requireTrimmed($this->bucket, 'bucket');
        $region = $this->requireTrimmed($this->region, 'region');
        $accessKey = $this->requireTrimmed($this->accessKey, 'access_key');
        $secretKey = $this->requireTrimmed($this->secretKey, 'secret_key');

        $timestamp = gmdate('Ymd\THis\Z');
        $date = substr($timestamp, 0, 8);
        $payloadHash = hash('sha256', $body ?? '');
        $target = $this->buildRequestTarget($bucket, $region, $objectKey);

        $headers = [
            'host' => $target['host'],
            'x-amz-content-sha256' => $payloadHash,
            'x-amz-date' => $timestamp,
        ];

        foreach ($extraHeaders as $name => $value) {
            $normalizedName = strtolower(trim($name));
            if ($normalizedName === '') {
                continue;
            }

            $headers[$normalizedName] = trim($value);
        }

        ksort($headers);

        $canonicalHeaders = '';
        foreach ($headers as $name => $value) {
            $canonicalHeaders .= sprintf('%s:%s' . "\n", $name, preg_replace('/\s+/', ' ', trim($value)) ?? trim($value));
        }

        $signedHeaders = implode(';', array_keys($headers));
        $canonicalRequest = implode("\n", [
            strtoupper($method),
            $target['canonical_uri'],
            '',
            $canonicalHeaders,
            $signedHeaders,
            $payloadHash,
        ]);

        $credentialScope = sprintf('%s/%s/%s/aws4_request', $date, $region, self::SERVICE_NAME);
        $stringToSign = implode("\n", [
            'AWS4-HMAC-SHA256',
            $timestamp,
            $credentialScope,
            hash('sha256', $canonicalRequest),
        ]);

        $signingKey = $this->buildSigningKey($secretKey, $date, $region);
        $signature = hash_hmac('sha256', $stringToSign, $signingKey);
        $headers['authorization'] = sprintf(
            'AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s',
            $accessKey,
            $credentialScope,
            $signedHeaders,
            $signature
        );

        return [
            'method' => strtoupper($method),
            'url' => $target['url'],
            'headers' => $headers,
            'body' => $body,
        ];
    }

    /**
     * @return array{url: string, host: string, canonical_uri: string}
     */
    private function buildRequestTarget(string $bucket, string $region, string $objectKey): array
    {
        $normalizedKey = $this->normalizeObjectKey($objectKey);
        $basePath = '';
        $scheme = 'https';
        $host = '';

        if (is_string($this->endpoint) && trim($this->endpoint) !== '') {
            $parts = parse_url(trim($this->endpoint));
            if ($parts === false || !isset($parts['host'])) {
                throw new \RuntimeException('The configured object storage endpoint is invalid.');
            }

            $scheme = $parts['scheme'] ?? 'https';
            $host = $parts['host'];
            if (isset($parts['port'])) {
                $host .= ':' . $parts['port'];
            }
            $basePath = isset($parts['path']) ? trim($parts['path'], '/') : '';
        } else {
            $host = $this->pathStyle
                ? sprintf('s3.%s.amazonaws.com', $region)
                : sprintf('%s.s3.%s.amazonaws.com', $bucket, $region);
        }

        $baseSegments = $basePath === '' ? [] : array_values(array_filter(explode('/', $basePath), static fn (string $segment): bool => $segment !== ''));
        $keySegments = explode('/', $normalizedKey);
        $uriSegments = $this->pathStyle
            ? [...$baseSegments, $bucket, ...$keySegments]
            : [...$baseSegments, ...$keySegments];

        $encodedSegments = array_map(static fn (string $segment): string => rawurlencode($segment), $uriSegments);
        $canonicalUri = '/' . implode('/', $encodedSegments);

        if (!$this->pathStyle && is_string($this->endpoint) && trim($this->endpoint) !== '') {
            $host = sprintf('%s.%s', $bucket, $host);
        }

        return [
            'url' => sprintf('%s://%s%s', $scheme, $host, $canonicalUri),
            'host' => $host,
            'canonical_uri' => $canonicalUri,
        ];
    }

    private function buildObjectKey(string $objectPrefix, string $storedName): string
    {
        $segments = array_filter([
            trim($objectPrefix, '/'),
            trim($storedName),
        ], static fn (string $segment): bool => $segment !== '');

        return implode('/', $segments);
    }

    /**
     * @param array<string, string> $query
     */
    private function buildCanonicalQuery(array $query): string
    {
        ksort($query);

        $pairs = [];
        foreach ($query as $key => $value) {
            $pairs[] = rawurlencode((string) $key) . '=' . rawurlencode((string) $value);
        }

        return implode('&', $pairs);
    }

    private function normalizeObjectKey(string $objectKey): string
    {
        return ltrim(trim($objectKey), '/');
    }

    private function buildCachePath(string $storagePath): string
    {
        $normalized = $this->normalizeObjectKey($storagePath);
        $extension = pathinfo($normalized, PATHINFO_EXTENSION);
        $safeExtension = $extension !== '' ? '.' . preg_replace('/[^A-Za-z0-9]+/', '', $extension) : '';
        $baseName = pathinfo($normalized, PATHINFO_FILENAME);
        $safeBaseName = preg_replace('/[^A-Za-z0-9._-]+/', '-', $baseName) ?: 'object';

        return sprintf(
            '%s/marketplace-object-storage/%s/%s-%s%s',
            rtrim(sys_get_temp_dir(), '/'),
            $this->driver,
            substr(hash('sha256', $normalized), 0, 18),
            trim($safeBaseName, '-._') !== '' ? trim($safeBaseName, '-._') : 'object',
            $safeExtension
        );
    }

    private function formatHeaderName(string $header): string
    {
        return implode('-', array_map(static fn (string $part): string => ucfirst($part), explode('-', $header)));
    }

    private function buildSigningKey(string $secretKey, string $date, string $region): string
    {
        $dateKey = hash_hmac('sha256', $date, 'AWS4' . $secretKey, true);
        $regionKey = hash_hmac('sha256', $region, $dateKey, true);
        $serviceKey = hash_hmac('sha256', self::SERVICE_NAME, $regionKey, true);

        return hash_hmac('sha256', 'aws4_request', $serviceKey, true);
    }

    /**
     * @return list<string>
     */
    private function missingConfigurationKeys(): array
    {
        $required = [
            'bucket' => $this->bucket,
            'region' => $this->region,
            'access_key' => $this->accessKey,
            'secret_key' => $this->secretKey,
        ];

        return array_keys(array_filter($required, static fn (?string $value): bool => !is_string($value) || trim($value) === ''));
    }

    private function assertConfigured(): void
    {
        $missing = $this->missingConfigurationKeys();
        if ($missing === []) {
            return;
        }

        throw new \RuntimeException(sprintf(
            'Object storage driver "%s" is missing required configuration: %s.',
            $this->driver,
            implode(', ', $missing)
        ));
    }

    private function requireTrimmed(?string $value, string $key): string
    {
        $trimmed = is_string($value) ? trim($value) : '';
        if ($trimmed === '') {
            throw new \RuntimeException(sprintf('Object storage driver "%s" is missing required configuration: %s.', $this->driver, $key));
        }

        return $trimmed;
    }
}
