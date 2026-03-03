<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Escrow;
use App\Entity\EscrowAuditLog;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class EscrowAuditLogger
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function log(Escrow $escrow, string $action, ?User $actor = null, array $metadata = []): void
    {
        $this->em->persist(new EscrowAuditLog(
            escrow: $escrow,
            action: strtoupper($action),
            actor: $actor,
            metadata: $metadata
        ));
    }
}
