<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'snippe_webhook_event')]
#[ORM\UniqueConstraint(name: 'uniq_snippe_webhook_event_id', columns: ['event_id'])]
class SnippeWebhookEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(name: 'external_reference', type: 'string', length: 100)]
    private string $externalReference;

    #[ORM\Column(name: 'event_id', type: 'string', length: 64)]
    private string $eventId;

    #[ORM\Column(name: 'event_type', type: 'string', length: 50)]
    private string $eventType;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $signature = null;

    #[ORM\Column(type: 'json')]
    private array $payload;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $receivedAt;

    #[ORM\Column(name: 'sent_at', type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $sentAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $processedAt = null;

    public function __construct(
        string $eventId,
        string $externalReference,
        string $eventType,
        array $payload,
        ?string $signature = null,
        ?\DateTimeImmutable $sentAt = null
    )
    {
        $this->eventId = $eventId;
        $this->externalReference = $externalReference;
        $this->eventType = $eventType;
        $this->payload = $payload;
        $this->signature = $signature;
        $this->receivedAt = new \DateTimeImmutable();
        $this->sentAt = $sentAt;
    }

    public function getEventId(): string
    {
        return $this->eventId;
    }

    public function markProcessed(): void
    {
        $this->processedAt = new \DateTimeImmutable();
    }
}
