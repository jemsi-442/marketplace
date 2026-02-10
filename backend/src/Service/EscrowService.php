<?php

namespace App\Service;

use App\Entity\Booking;
use App\Entity\Escrow;
use App\Entity\Payment;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\DBAL\LockMode;

class EscrowService
{
    public const STATUS_HELD      = 'held';
    public const STATUS_RELEASED  = 'released';
    public const STATUS_REFUNDED  = 'refunded';
    public const STATUS_DISPUTED  = 'disputed';

    public function __construct(
        private EntityManagerInterface $em,
        private EscrowAuditLogger $auditLogger
    ) {}

    /**
     * Create escrow (idempotent-safe)
     */
    public function createEscrow(
        Booking $booking,
        User $client,
        User $vendor,
        float $amount
    ): Escrow {

        if ($amount <= 0) {
            throw new \LogicException('Escrow amount must be greater than zero.');
        }

        if ($booking->getEscrow()) {
            throw new \LogicException('Escrow already exists for this booking.');
        }

        return $this->em->wrapInTransaction(function () use ($booking, $client, $vendor, $amount) {

            $escrow = new Escrow();
            $escrow->setBooking($booking);
            $escrow->setClient($client);
            $escrow->setVendor($vendor);
            $escrow->setAmount($amount);
            $escrow->setStatus(self::STATUS_HELD);
            $escrow->setCreatedAt(new \DateTimeImmutable());

            $this->em->persist($escrow);
            $this->em->flush();

            $this->auditLogger->log(
                escrow: $escrow,
                action: 'ESCROW_CREATED',
                actor: $client,
                metadata: [
                    'booking_id' => $booking->getId(),
                    'amount' => $amount
                ]
            );

            return $escrow;
        });
    }

    /**
     * Client confirms → release funds
     */
    public function releaseByClient(Escrow $escrow, User $client): void
    {
        $this->em->wrapInTransaction(function () use ($escrow, $client) {

            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            $this->assertState($escrow, self::STATUS_HELD);
            $this->assertOwnership($escrow->getClient(), $client);

            if ($escrow->getReleasedAt()) {
                throw new \LogicException('Escrow already released.');
            }

            $escrow->setStatus(self::STATUS_RELEASED);
            $escrow->setReleasedAt(new \DateTimeImmutable());
            $escrow->setAdminDecision('client_confirmed');

            $escrow->getBooking()->setStatus('completed');

            $payment = $this->createPayment(
                user: $escrow->getVendor(),
                amount: $escrow->getAmount(),
                method: 'escrow_release'
            );

            $this->auditLogger->log(
                escrow: $escrow,
                action: 'ESCROW_RELEASED_BY_CLIENT',
                actor: $client,
                metadata: ['amount' => $escrow->getAmount()]
            );
        });
    }

    /**
     * Client opens dispute
     */
    public function openDispute(Escrow $escrow, User $client, string $reason): void
    {
        if (trim($reason) === '') {
            throw new \LogicException('Dispute reason cannot be empty.');
        }

        $this->em->wrapInTransaction(function () use ($escrow, $client, $reason) {

            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            $this->assertState($escrow, self::STATUS_HELD);
            $this->assertOwnership($escrow->getClient(), $client);

            $escrow->setStatus(self::STATUS_DISPUTED);
            $escrow->setDisputeReason($reason);
            $escrow->setDisputedAt(new \DateTimeImmutable());

            $this->auditLogger->log(
                escrow: $escrow,
                action: 'ESCROW_DISPUTED',
                actor: $client,
                metadata: ['reason' => $reason]
            );
        });
    }

    /**
     * Admin force release (vendor wins)
     */
    public function forceReleaseByAdmin(Escrow $escrow, User $admin): void
    {
        $this->assertAdmin($admin);

        $this->em->wrapInTransaction(function () use ($escrow, $admin) {

            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            $this->assertState($escrow, self::STATUS_DISPUTED);

            $escrow->setStatus(self::STATUS_RELEASED);
            $escrow->setReleasedAt(new \DateTimeImmutable());
            $escrow->setAdminDecision('force_release');

            $escrow->getBooking()->setStatus('completed');

            $this->createPayment(
                user: $escrow->getVendor(),
                amount: $escrow->getAmount(),
                method: 'admin_force_release'
            );

            $this->auditLogger->log(
                escrow: $escrow,
                action: 'ESCROW_FORCE_RELEASED_BY_ADMIN',
                actor: $admin,
                metadata: ['amount' => $escrow->getAmount()]
            );
        });
    }

    /**
     * Admin refund (client wins)
     */
    public function refundByAdmin(Escrow $escrow, User $admin): void
    {
        $this->assertAdmin($admin);

        $this->em->wrapInTransaction(function () use ($escrow, $admin) {

            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            $this->assertState($escrow, self::STATUS_DISPUTED);

            $escrow->setStatus(self::STATUS_REFUNDED);
            $escrow->setResolvedAt(new \DateTimeImmutable());
            $escrow->setAdminDecision('refund');

            $escrow->getBooking()->setStatus('cancelled');

            $this->createPayment(
                user: $escrow->getClient(),
                amount: $escrow->getAmount(),
                method: 'escrow_refund'
            );

            $this->auditLogger->log(
                escrow: $escrow,
                action: 'ESCROW_REFUNDED_BY_ADMIN',
                actor: $admin,
                metadata: ['amount' => $escrow->getAmount()]
            );
        });
    }

    /* ============================================================
       INTERNAL GUARDS
       ============================================================ */

    private function assertState(Escrow $escrow, string $expected): void
    {
        if ($escrow->getStatus() !== $expected) {
            throw new \LogicException(
                sprintf(
                    'Invalid escrow state. Expected "%s", got "%s".',
                    $expected,
                    $escrow->getStatus()
                )
            );
        }
    }

    private function assertOwnership(User $expected, User $actual): void
    {
        if ($expected->getId() !== $actual->getId()) {
            throw new \LogicException('Unauthorized escrow operation.');
        }
    }

    private function assertAdmin(User $user): void
    {
        if (!in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            throw new \LogicException('Admin privileges required.');
        }
    }

    private function createPayment(User $user, float $amount, string $method): Payment
    {
        if ($amount <= 0) {
            throw new \LogicException('Invalid payment amount.');
        }

        $payment = new Payment();
        $payment->setUser($user);
        $payment->setAmount($amount);
        $payment->setMethod($method);
        $payment->setStatus('success');
        $payment->setCreatedAt(new \DateTimeImmutable());

        $this->em->persist($payment);
        $this->em->flush();

        return $payment;
    }
}
