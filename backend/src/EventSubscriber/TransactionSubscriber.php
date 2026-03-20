<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\Payment;
use App\Service\TransactionMonitorService;
use Doctrine\Common\EventSubscriber;
use Doctrine\ORM\Event\PostFlushEventArgs;
use Doctrine\ORM\Event\PostPersistEventArgs;
use Doctrine\ORM\Events;

class TransactionSubscriber implements EventSubscriber
{
    /** @var Payment[] */
    private array $queuedPayments = [];
    private bool $processing = false;

    public function __construct(
        private TransactionMonitorService $monitor
    ) {}

    public function getSubscribedEvents(): array
    {
        return [Events::postPersist, Events::postFlush];
    }

    public function postPersist(PostPersistEventArgs $args): void
    {
        $entity = $args->getObject();

        if ($entity instanceof Payment) {
            $this->queuedPayments[] = $entity;
        }
    }

    public function postFlush(PostFlushEventArgs $args): void
    {
        if ($this->processing || $this->queuedPayments === []) {
            return;
        }

        $this->processing = true;
        $payments = $this->queuedPayments;
        $this->queuedPayments = [];
        try {
            foreach ($payments as $payment) {
                $this->monitor->monitorPayment($payment, false);
            }

            $args->getObjectManager()->flush();
        } finally {
            $this->processing = false;
        }
    }
}
