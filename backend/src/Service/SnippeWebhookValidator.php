<?php

declare(strict_types=1);

namespace App\Service;

final class SnippeWebhookValidator
{
    public function __construct(
        private readonly SnippeClient $snippeClient,
        private readonly int $maxSkewSeconds
    ) {
    }

    public function assertValid(string $rawBody, ?string $signature, ?string $timestamp): void
    {
        if ($timestamp === null || trim($timestamp) === '') {
            throw new \InvalidArgumentException('Missing webhook timestamp header.');
        }

        if (!ctype_digit($timestamp)) {
            throw new \InvalidArgumentException('Invalid webhook timestamp header.');
        }

        $ts = (int) $timestamp;
        $now = time();

        if (abs($now - $ts) > $this->maxSkewSeconds) {
            throw new \InvalidArgumentException('Webhook timestamp outside allowed skew window.');
        }

        if (!$this->snippeClient->verifyWebhookSignature($rawBody, $signature)) {
            throw new \InvalidArgumentException('Invalid or missing webhook signature.');
        }
    }
}
