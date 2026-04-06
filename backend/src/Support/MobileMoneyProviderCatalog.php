<?php

declare(strict_types=1);

namespace App\Support;

final class MobileMoneyProviderCatalog
{
    /**
     * @var array<int, array{
     *   code: string,
     *   label: string,
     *   subtitle: string,
     *   logoPath: string,
     *   logoShellClassName: string,
     *   aliases: array<int, string>
     * }>
     */
    private static ?array $providerCatalog = null;

    /**
     * @var array<string, string>|null
     */
    private static ?array $providerAliases = null;

    /**
     * @var array<string, string>|null
     */
    private static ?array $providerLabels = null;

    public static function normalizeProvider(?string $provider): ?string
    {
        if ($provider === null) {
            return null;
        }

        $normalized = self::normalizeProviderToken($provider);
        if ($normalized === '') {
            return null;
        }

        return self::providerAliases()[$normalized] ?? null;
    }

    public static function labelForCode(string $providerCode): string
    {
        $normalized = self::normalizeProvider($providerCode);

        return $normalized !== null ? (self::providerLabels()[$normalized] ?? $normalized) : strtoupper(trim($providerCode));
    }

    public static function normalizeTanzanianMsisdn(?string $msisdn): ?string
    {
        if ($msisdn === null) {
            return null;
        }

        $digits = (string) preg_replace('/\D+/', '', trim($msisdn));
        if ($digits === '') {
            return null;
        }

        if (preg_match('/^255[67]\d{8}$/', $digits) === 1) {
            return $digits;
        }

        if (preg_match('/^0[67]\d{8}$/', $digits) === 1) {
            return '255' . substr($digits, 1);
        }

        if (preg_match('/^[67]\d{8}$/', $digits) === 1) {
            return '255' . $digits;
        }

        return null;
    }

    /**
     * @return array<int, array{
     *   code: string,
     *   label: string,
     *   subtitle: string,
     *   logoPath: string,
     *   logoShellClassName: string,
     *   aliases: array<int, string>
     * }>
     */
    public static function providers(): array
    {
        if (self::$providerCatalog !== null) {
            return self::$providerCatalog;
        }

        $catalogPath = dirname(__DIR__, 3) . '/shared/mobile-money-providers.json';
        $rawCatalog = file_get_contents($catalogPath);
        if ($rawCatalog === false) {
            throw new \RuntimeException('Unable to read mobile money provider catalog.');
        }

        $decoded = json_decode($rawCatalog, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Mobile money provider catalog is invalid.');
        }

        $providers = [];
        foreach ($decoded as $row) {
            if (!is_array($row)) {
                continue;
            }

            $code = isset($row['code']) && is_string($row['code']) ? strtoupper(trim($row['code'])) : '';
            $label = isset($row['label']) && is_string($row['label']) ? trim($row['label']) : '';
            $subtitle = isset($row['subtitle']) && is_string($row['subtitle']) ? trim($row['subtitle']) : '';
            $logoPath = isset($row['logoPath']) && is_string($row['logoPath']) ? trim($row['logoPath']) : '';
            $logoShellClassName = isset($row['logoShellClassName']) && is_string($row['logoShellClassName']) ? trim($row['logoShellClassName']) : '';

            if ($code === '' || $label === '') {
                continue;
            }

            $aliases = [];
            foreach (($row['aliases'] ?? []) as $alias) {
                if (!is_string($alias)) {
                    continue;
                }

                $normalizedAlias = self::normalizeProviderToken($alias);
                if ($normalizedAlias !== '') {
                    $aliases[] = $normalizedAlias;
                }
            }

            if ($aliases === []) {
                $aliases[] = $code;
            }

            $providers[] = [
                'code' => $code,
                'label' => $label,
                'subtitle' => $subtitle,
                'logoPath' => $logoPath,
                'logoShellClassName' => $logoShellClassName,
                'aliases' => array_values(array_unique($aliases)),
            ];
        }

        self::$providerCatalog = $providers;

        return self::$providerCatalog;
    }

    /**
     * @return array<string, string>
     */
    private static function providerAliases(): array
    {
        if (self::$providerAliases !== null) {
            return self::$providerAliases;
        }

        $aliases = [];
        foreach (self::providers() as $provider) {
            foreach ($provider['aliases'] as $alias) {
                $aliases[$alias] = $provider['code'];
            }
        }

        self::$providerAliases = $aliases;

        return self::$providerAliases;
    }

    /**
     * @return array<string, string>
     */
    private static function providerLabels(): array
    {
        if (self::$providerLabels !== null) {
            return self::$providerLabels;
        }

        $labels = [];
        foreach (self::providers() as $provider) {
            $labels[$provider['code']] = $provider['label'];
        }

        self::$providerLabels = $labels;

        return self::$providerLabels;
    }

    private static function normalizeProviderToken(string $provider): string
    {
        return strtoupper((string) preg_replace('/[^A-Za-z0-9]+/', '', trim($provider)));
    }
}
