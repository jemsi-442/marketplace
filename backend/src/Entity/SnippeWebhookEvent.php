<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'snippe_webhook_event')]
#[ORM\UniqueConstraint(name: 'uniq_snippe_webhook_external_ref', columns: ['external_reference'])]
class SnippeWebhookEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(name: 'external_reference', type: 'string', length: 100)]
    private string $externalReference;

    #[ORM\Column(name: 'event_type', type: 'string', length: 50)]
    private string $eventType;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $signature = null;

    #[ORM\Column(type: 'json')]
    private array $payload;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $receivedAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $processedAt = null;

    public function __construct(string $externalReference, string $eventType, array $payload, ?string $signature = null)
    {
        $this->externalReference = $externalReference;
        $this->eventType = $eventType;
        $this->payload = $payload;
        $this->signature = $signature;
        $this->receivedAt = new \DateTimeImmutable();
    }

    public function markProcessed(): void
    {
        $this->processedAt = new \DateTimeImmutable();
    }
}
