<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\Review;
use App\Entity\User;
use App\Service\VendorTrustCalculator;
use Doctrine\Common\EventSubscriber;
use Doctrine\ORM\Event\LifecycleEventArgs;
use Doctrine\ORM\Events;

class ReviewTrustSubscriber implements EventSubscriber
{
    public function __construct(private readonly VendorTrustCalculator $trustCalculator)
    {
    }

    public function getSubscribedEvents(): array
    {
        return [Events::postPersist];
    }

    public function postPersist(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        if (!$entity instanceof Review) {
            return;
        }

        $vendor = $entity->getBooking()?->getService()?->getVendor()?->getUser();
        if (!$vendor instanceof User) {
            return;
        }

        $this->trustCalculator->recalculateForVendor($vendor, 'REVIEW_CREATED', [
            'review_id' => $entity->getId(),
            'booking_id' => $entity->getBooking()?->getId(),
        ]);
    }
}
