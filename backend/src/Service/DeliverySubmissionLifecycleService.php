<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\DeliveryAttachment;
use App\Entity\DeliverySubmission;
use Doctrine\ORM\EntityManagerInterface;

final class DeliverySubmissionLifecycleService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly DeliveryAttachmentStorage $deliveryAttachmentStorage,
    ) {
    }

    public function deleteSubmission(DeliverySubmission $deliverySubmission): void
    {
        foreach ($deliverySubmission->getAttachments() as $attachment) {
            $this->deliveryAttachmentStorage->removeStoredAttachment($attachment->getStoragePath());
        }

        $this->entityManager->remove($deliverySubmission);
        $this->entityManager->flush();
    }

    public function deleteAttachment(DeliveryAttachment $deliveryAttachment): void
    {
        $deliverySubmission = $deliveryAttachment->getDeliverySubmission();
        if ($deliverySubmission instanceof DeliverySubmission) {
            $deliverySubmission->removeAttachment($deliveryAttachment);
        }

        $this->deliveryAttachmentStorage->removeStoredAttachment($deliveryAttachment->getStoragePath());
        $this->entityManager->remove($deliveryAttachment);
        $this->entityManager->flush();
    }
}
