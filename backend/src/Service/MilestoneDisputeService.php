<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\EscrowMilestone;
use App\Entity\MilestoneDispute;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class MilestoneDisputeService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EscrowAuditLogger $auditLogger
    ) {
    }

    public function openDispute(EscrowMilestone $milestone, User $openedBy, string $reason): MilestoneDispute
    {
        return $this->em->wrapInTransaction(function () use ($milestone, $openedBy, $reason): MilestoneDispute {
            if (!$milestone->isReleased()) {
                throw new \LogicException('Only released milestones can be disputed.');
            }

            if ($this->hasOpenDispute($milestone)) {
                throw new \LogicException('Milestone already has an active dispute.');
            }

            $dispute = new MilestoneDispute();
            $dispute->setMilestone($milestone);
            $dispute->setOpenedBy($openedBy);
            $dispute->setReason($reason);
            $dispute->setStatus('open');

            $this->em->persist($dispute);
            $this->em->flush();

            $escrow = $milestone->getEscrow();

            $this->auditLogger->log(
                escrow: $escrow,
                action: 'MILESTONE_DISPUTE_OPENED',
                actor: $openedBy,
                metadata: [
                    'milestone_id' => $milestone->getId(),
                    'reason' => $reason,
                ]
            );

            return $dispute;
        });
    }

    public function resolveRelease(MilestoneDispute $dispute, User $admin): void
    {
        $this->assertAdmin($admin);

        $this->em->wrapInTransaction(function () use ($dispute, $admin): void {
            if ($dispute->getStatus() !== 'open') {
                throw new \LogicException('Dispute already resolved.');
            }

            $milestone = $dispute->getMilestone();
            $milestone->setReleased(true);

            $dispute->setStatus('resolved_release');
            $dispute->setAdminDecision('release');
            $dispute->setResolvedAt(new \DateTimeImmutable());

            $this->em->flush();

            $escrow = $milestone->getEscrow();

            $this->auditLogger->log(
                escrow: $escrow,
                action: 'MILESTONE_DISPUTE_RESOLVED_RELEASE',
                actor: $admin,
                metadata: [
                    'milestone_id' => $milestone->getId(),
                    'amount_minor' => $milestone->getAmountMinor(),
                    'currency' => $escrow->getCurrency(),
                ]
            );
        });
    }

    public function resolveRefund(MilestoneDispute $dispute, User $admin): void
    {
        $this->assertAdmin($admin);

        $this->em->wrapInTransaction(function () use ($dispute, $admin): void {
            if ($dispute->getStatus() !== 'open') {
                throw new \LogicException('Dispute already resolved.');
            }

            $milestone = $dispute->getMilestone();
            $milestone->setReleased(false);

            $dispute->setStatus('resolved_refund');
            $dispute->setAdminDecision('refund');
            $dispute->setResolvedAt(new \DateTimeImmutable());

            $this->em->flush();

            $escrow = $milestone->getEscrow();

            $this->auditLogger->log(
                escrow: $escrow,
                action: 'MILESTONE_DISPUTE_RESOLVED_REFUND',
                actor: $admin,
                metadata: [
                    'milestone_id' => $milestone->getId(),
                    'amount_minor' => $milestone->getAmountMinor(),
                    'currency' => $escrow->getCurrency(),
                ]
            );
        });
    }

    /**
     * @return array{recommendation: string, confidence: float, reason: string, dispute_id: int|null}
     */
    public function getAiRecommendation(MilestoneDispute $dispute): array
    {
        return [
            'recommendation' => 'manual_review',
            'confidence' => 0.5,
            'reason' => 'No milestone-specific AI model currently configured.',
            'dispute_id' => $dispute->getId(),
        ];
    }

    private function hasOpenDispute(EscrowMilestone $milestone): bool
    {
        return (bool) $this->em->getRepository(MilestoneDispute::class)->findOneBy([
            'milestone' => $milestone,
            'status' => 'open',
        ]);
    }

    private function assertAdmin(User $user): void
    {
        if (!in_array('ROLE_ADMIN', $user->getRoles(), true) && !in_array('ROLE_SUPER_ADMIN', $user->getRoles(), true)) {
            throw new AccessDeniedException('Admin privileges required.');
        }
    }
}
