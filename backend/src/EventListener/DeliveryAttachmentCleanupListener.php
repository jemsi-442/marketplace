<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Entity\DeliveryAttachment;
use App\Entity\DeliverySubmission;
use App\Service\DeliveryAttachmentStorage;

final class DeliveryAttachmentCleanupListener
{
    public function __construct(
        private readonly DeliveryAttachmentStorage $deliveryAttachmentStorage,
    ) {
    }

    public function preRemoveAttachment(DeliveryAttachment $attachment): void
    {
        $this->deliveryAttachmentStorage->removeStoredAttachment($attachment->getStoragePath());
    }

    public function preRemoveSubmission(DeliverySubmission $deliverySubmission): void
    {
        foreach ($deliverySubmission->getAttachments() as $attachment) {
            $this->deliveryAttachmentStorage->removeStoredAttachment($attachment->getStoragePath());
        }
    }
}
