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

    public function recordIncoming(string $externalReference, string $eventType, array $payload, ?string $signature): bool
    {
        try {
            $this->em->persist(new SnippeWebhookEvent($externalReference, $eventType, $payload, $signature));
            $this->em->flush();

            return true;
        } catch (UniqueConstraintViolationException) {
            return false;
        }
    }
}
