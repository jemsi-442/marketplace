<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\Process\ExecutableFinder;

final class OperationsDiagnosticsService
{
    public function __construct(
        private readonly PlatformMetricsHealthService $metricsHealthService,
        private readonly string $objectStorageDriver,
        private readonly S3CompatibleObjectStorage $s3CompatibleObjectStorage,
        private readonly bool $uploadScanEnabled,
        private readonly string $uploadScanBinary,
        private readonly int $uploadScanTimeoutSeconds,
        private readonly bool $uploadScanFailClosed,
        private readonly string $appEnv,
    ) {
    }

    /**
     * @return array{
     *     status: string,
     *     checked_at: string,
     *     app_env: string,
     *     request_tracing: array{enabled: bool},
     *     object_storage: array{
     *         status: string,
     *         driver: string,
     *         message: string
     *     },
     *     metrics_pipeline: array<string, mixed>,
     *     upload_scanning: array{
     *         status: string,
     *         enabled: bool,
     *         binary: string,
     *         binary_available: bool,
     *         timeout_seconds: int,
     *         fail_closed: bool,
     *         message: string
     *     }
     * }
     */
    public function getOverview(): array
    {
        $metricsHealth = $this->metricsHealthService->getHealthStatus();
        $objectStorage = $this->buildObjectStorageStatus();
        $uploadScanning = $this->buildUploadScanningStatus();

        $overallStatus = (
            !$metricsHealth['is_healthy']
            || $uploadScanning['status'] === 'DEGRADED'
            || $objectStorage['status'] === 'UNSUPPORTED'
        )
            ? 'ATTENTION'
            : 'HEALTHY';

        return [
            'status' => $overallStatus,
            'checked_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'app_env' => $this->appEnv,
            'request_tracing' => [
                'enabled' => true,
            ],
            'object_storage' => $objectStorage,
            'metrics_pipeline' => $metricsHealth,
            'upload_scanning' => $uploadScanning,
        ];
    }

    /**
     * @return array{
     *     status: string,
     *     driver: string,
     *     message: string
     * }
     */
    private function buildObjectStorageStatus(): array
    {
        if (in_array($this->objectStorageDriver, ['s3', 'minio'], true)) {
            $configuredKeys = $this->s3CompatibleObjectStorage->getConfiguredKeys();

            return [
                'status' => $this->s3CompatibleObjectStorage->isConfigured() ? 'READY' : 'DEGRADED',
                'driver' => $this->objectStorageDriver,
                'message' => $this->s3CompatibleObjectStorage->isConfigured()
                    ? sprintf(
                        'The "%s" object storage driver is configured for remote uploads and downloads. Config present: %s.',
                        $this->objectStorageDriver,
                        $configuredKeys === [] ? 'none' : implode(', ', $configuredKeys)
                    )
                    : sprintf(
                        'The "%s" object storage driver is selected, but it is missing required configuration. Config present: %s.',
                        $this->objectStorageDriver,
                        $configuredKeys === [] ? 'none' : implode(', ', $configuredKeys)
                    ),
            ];
        }

        return match ($this->objectStorageDriver) {
            'local' => [
                'status' => 'READY',
                'driver' => 'local',
                'message' => 'Local filesystem storage is active for uploads and downloads.',
            ],
            default => [
                'status' => 'UNSUPPORTED',
                'driver' => $this->objectStorageDriver,
                'message' => sprintf('The "%s" object storage driver is unknown to this build.', $this->objectStorageDriver),
            ],
        };
    }

    /**
     * @return array{
     *     status: string,
     *     enabled: bool,
     *     binary: string,
     *     binary_available: bool,
     *     timeout_seconds: int,
     *     fail_closed: bool,
     *     message: string
     * }
     */
    private function buildUploadScanningStatus(): array
    {
        if (!$this->uploadScanEnabled) {
            return [
                'status' => 'DISABLED',
                'enabled' => false,
                'binary' => $this->uploadScanBinary,
                'binary_available' => false,
                'timeout_seconds' => $this->uploadScanTimeoutSeconds,
                'fail_closed' => $this->uploadScanFailClosed,
                'message' => 'Upload scanning is disabled in the current environment.',
            ];
        }

        $finder = new ExecutableFinder();
        $resolvedBinary = str_contains($this->uploadScanBinary, '/')
            ? $this->uploadScanBinary
            : ($finder->find($this->uploadScanBinary) ?: null);
        $binaryAvailable = is_string($resolvedBinary) && $resolvedBinary !== '' && is_executable($resolvedBinary);

        return [
            'status' => $binaryAvailable ? 'READY' : 'DEGRADED',
            'enabled' => true,
            'binary' => $this->uploadScanBinary,
            'binary_available' => $binaryAvailable,
            'timeout_seconds' => $this->uploadScanTimeoutSeconds,
            'fail_closed' => $this->uploadScanFailClosed,
            'message' => $binaryAvailable
                ? 'Upload scanning is enabled and the scanner binary is available.'
                : 'Upload scanning is enabled, but the scanner binary was not found on this server.',
        ];
    }
}
