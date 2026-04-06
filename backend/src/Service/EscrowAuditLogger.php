<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Escrow;
use App\Entity\EscrowAuditLog;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class EscrowAuditLogger
{
    private const MAX_DEPTH = 3;
    private const MAX_ITEMS = 20;
    private const MAX_STRING_LENGTH = 180;

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function log(Escrow $escrow, string $action, ?User $actor = null, array $metadata = []): void
    {
        $this->em->persist(new EscrowAuditLog(
            escrow: $escrow,
            action: strtoupper($action),
            actor: $actor,
            metadata: $this->sanitizeArray($metadata)
        ));
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function sanitizeArray(array $data, int $depth = 0): array
    {
        if ($depth >= self::MAX_DEPTH) {
            return ['_truncated' => 'depth_limit'];
        }

        $sanitized = [];
        $count = 0;

        foreach ($data as $key => $value) {
            if ($count >= self::MAX_ITEMS) {
                $sanitized['_truncated'] = 'item_limit';
                break;
            }

            $normalizedKey = mb_substr(trim((string) $key), 0, 80);
            if ($normalizedKey === '') {
                continue;
            }

            $sanitized[$normalizedKey] = $this->sanitizeValue($normalizedKey, $value, $depth);
            ++$count;
        }

        return $sanitized;
    }

    private function sanitizeValue(string $key, mixed $value, int $depth): mixed
    {
        if ($this->isSensitiveKey($key)) {
            return '[redacted]';
        }

        if (is_array($value)) {
            return $this->sanitizeArray($value, $depth + 1);
        }

        if (is_string($value)) {
            $normalized = trim($value);

            return mb_substr($normalized, 0, self::MAX_STRING_LENGTH);
        }

        if (is_scalar($value) || $value === null) {
            return $value;
        }

        return '[omitted]';
    }

    private function isSensitiveKey(string $key): bool
    {
        $normalized = strtolower($key);

        foreach (['email', 'phone', 'msisdn', 'signature', 'token', 'secret', 'authorization', 'webhook_url', 'callback_url'] as $needle) {
            if (str_contains($normalized, $needle)) {
                return true;
            }
        }

        return false;
    }
}
