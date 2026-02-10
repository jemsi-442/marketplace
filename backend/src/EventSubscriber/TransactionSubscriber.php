<?php

namespace App\EventSubscriber;

use App\Entity\Payment;
use Doctrine\ORM\Event\LifecycleEventArgs;
use Doctrine\Common\EventSubscriber;
use Doctrine\ORM\Events;
use App\Service\TransactionMonitorService;

class TransactionSubscriber implements EventSubscriber
{
    public function __construct(
        private TransactionMonitorService $monitor
    ) {}

    public function getSubscribedEvents(): array
    {
        return [Events::postPersist];
    }

    public function postPersist(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();

        if ($entity instanceof Payment) {
            $this->monitor->monitorPayment($entity);
        }
    }
}
