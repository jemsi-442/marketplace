<?php

namespace App\Service;

use App\Entity\Escrow;
use App\Entity\EscrowAuditLog;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class EscrowAuditLogger
{
    public function __construct(
        private EntityManagerInterface $em
    ) {}

    public function log(
        Escrow $escrow,
        string $action,
        ?User $actor = null,
        array $metadata = []
    ): void {
        $log = new EscrowAuditLog(
            escrow: $escrow,
            action: $action,
            actor: $actor,
            metadata: $metadata
        );

        $this->em->persist($log);
        $this->em->flush();
    }
}
