<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\SnippeWebhookEvent;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;

class SnippeWebhookService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

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
                payload: $payload,
                signature: $signature,
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
        if (method_exists($this->em, 'isOpen') && !$this->em->isOpen()) {
            return;
        }

        $event = $this->em->getRepository(SnippeWebhookEvent::class)->findOneBy(['eventId' => $eventId]);
        if (!$event instanceof SnippeWebhookEvent) {
            return;
        }

        $event->markProcessed();
        $this->em->flush();
    }
}
