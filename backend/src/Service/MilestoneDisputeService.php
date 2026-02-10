<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\EscrowMilestone;
use App\Entity\MilestoneDispute;
use App\Entity\Payment;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class MilestoneDisputeService
{
    public function __construct(
        private EntityManagerInterface $em,
        private EscrowAuditLogger $auditLogger,
        private AiRecommendationService $aiRecommendationService
    ) {}

    /**
     * Open dispute on a completed milestone
     */
    public function openDispute(
        EscrowMilestone $milestone,
        User $openedBy,
        string $reason
    ): MilestoneDispute {

        return $this->em->wrapInTransaction(function () use ($milestone, $openedBy, $reason) {

            if ($milestone->getStatus() !== 'completed') {
                throw new \LogicException('Only completed milestones can be disputed.');
            }

            if ($this->hasOpenDispute($milestone)) {
                throw new \LogicException('Milestone already has an active dispute.');
            }

            $dispute = new MilestoneDispute();
            $dispute->setMilestone($milestone);
            $dispute->setOpenedBy($openedBy);
            $dispute->setReason($reason);
            $dispute->setStatus('open');

            $milestone->setStatus('disputed');

            $this->em->persist($dispute);
            $this->em->flush();

            $this->auditLogger->log(
                escrow: $milestone->getEscrow(),
                action: 'MILESTONE_DISPUTE_OPENED',
                actor: $openedBy,
                metadata: [
                    'milestone_id' => $milestone->getId(),
                    'reason' => $reason
                ]
            );

            return $dispute;
        });
    }

    /**
     * Admin resolves dispute → release funds to vendor
     */
    public function resolveRelease(
        MilestoneDispute $dispute,
        User $admin
    ): void {

        $this->assertAdmin($admin);

        $this->em->wrapInTransaction(function () use ($dispute, $admin) {

            if ($dispute->getStatus() !== 'open') {
                throw new \LogicException('Dispute already resolved.');
            }

            $milestone = $dispute->getMilestone();
            $escrow = $milestone->getEscrow();

            $milestone->setStatus('released');
            $milestone->setReleasedAt(new \DateTimeImmutable());

            $dispute->setStatus('resolved_release');
            $dispute->setAdminDecision('release');
            $dispute->setResolvedAt(new \DateTimeImmutable());

            $this->createPayment(
                user: $escrow->getVendor(),
                amount: $milestone->getAmount(),
                method: 'milestone_admin_release'
            );

            $this->em->flush();

            $this->auditLogger->log(
                escrow: $escrow,
                action: 'MILESTONE_DISPUTE_RESOLVED_RELEASE',
                actor: $admin,
                metadata: [
                    'milestone_id' => $milestone->getId(),
                    'amount' => $milestone->getAmount()
                ]
            );
        });
    }

    /**
     * Admin resolves dispute → refund client
     */
    public function resolveRefund(
        MilestoneDispute $dispute,
        User $admin
    ): void {

        $this->assertAdmin($admin);

        $this->em->wrapInTransaction(function () use ($dispute, $admin) {

            if ($dispute->getStatus() !== 'open') {
                throw new \LogicException('Dispute already resolved.');
            }

            $milestone = $dispute->getMilestone();
            $escrow = $milestone->getEscrow();

            $milestone->setStatus('refunded');

            $dispute->setStatus('resolved_refund');
            $dispute->setAdminDecision('refund');
            $dispute->setResolvedAt(new \DateTimeImmutable());

            $this->createPayment(
                user: $escrow->getClient(),
                amount: $milestone->getAmount(),
                method: 'milestone_admin_refund'
            );

            $this->em->flush();

            $this->auditLogger->log(
                escrow: $escrow,
                action: 'MILESTONE_DISPUTE_RESOLVED_REFUND',
                actor: $admin,
                metadata: [
                    'milestone_id' => $milestone->getId(),
                    'amount' => $milestone->getAmount()
                ]
            );
        });
    }

    /**
     * AI recommendation for dispute (non-binding)
     */
    public function getAiRecommendation(MilestoneDispute $dispute): array
    {
        return $this->aiRecommendationService->analyzeMilestoneDispute($dispute);
    }

    /**
     * Check if milestone already has open dispute
     */
    private function hasOpenDispute(EscrowMilestone $milestone): bool
    {
        return (bool) $this->em->getRepository(MilestoneDispute::class)
            ->findOneBy([
                'milestone' => $milestone,
                'status' => 'open'
            ]);
    }

    /**
     * Create payment record safely
     */
    private function createPayment(
        User $user,
        float $amount,
        string $method
    ): void {

        $payment = new Payment();
        $payment->setUser($user);
        $payment->setAmount($amount);
        $payment->setMethod($method);
        $payment->setStatus('success');
        $payment->setCreatedAt(new \DateTimeImmutable());

        $this->em->persist($payment);
    }

    /**
     * Ensure admin role
     */
    private function assertAdmin(User $user): void
    {
        if (!in_array('ROLE_ADMIN', $user->getRoles(), true)
            && !in_array('ROLE_SUPER_ADMIN', $user->getRoles(), true)
        ) {
            throw new AccessDeniedException('Admin privileges required.');
        }
    }
}
