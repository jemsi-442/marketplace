<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\SnippeWebhookEvent;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;

class SnippeWebhookService
{
    private const MAX_DEPTH = 3;
    private const MAX_ITEMS = 20;
    private const MAX_STRING_LENGTH = 180;

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function recordIncoming(
        string $eventId,
        string $externalReference,
        string $eventType,
        array $payload,
        ?string $signature,
        ?\DateTimeImmutable $sentAt = null
    ): bool
    {
        try {
            $this->em->persist(new SnippeWebhookEvent(
                eventId: $eventId,
                externalReference: $externalReference,
                eventType: $eventType,
                payload: $this->sanitizeArray($payload),
                signature: $this->normalizeSignature($signature),
                sentAt: $sentAt
            ));
            $this->em->flush();

            return true;
        } catch (UniqueConstraintViolationException) {
            return false;
        }
    }

    public function markProcessed(string $eventId): void
    {
        if (!$this->em->isOpen()) {
            return;
        }

        $event = $this->em->getRepository(SnippeWebhookEvent::class)->findOneBy(['eventId' => $eventId]);
        if (!$event instanceof SnippeWebhookEvent) {
            return;
        }

        $event->markProcessed();
        $this->em->flush();
    }

    private function normalizeSignature(?string $signature): ?string
    {
        if ($signature === null || trim($signature) === '') {
            return null;
        }

        return hash('sha256', trim($signature));
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
            return mb_substr(trim($value), 0, self::MAX_STRING_LENGTH);
        }

        if (is_scalar($value) || $value === null) {
            return $value;
        }

        return '[omitted]';
    }

    private function isSensitiveKey(string $key): bool
    {
        $normalized = strtolower($key);

        foreach (['email', 'phone', 'msisdn', 'signature', 'token', 'secret', 'authorization'] as $needle) {
            if (str_contains($normalized, $needle)) {
                return true;
            }
        }

        return false;
    }
}
