<?php

namespace App\Service;

use App\Entity\Booking;
use App\Entity\Escrow;
use App\Entity\User;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;

class EscrowService
{
    public const STATUS_HELD     = 'HELD';
    public const STATUS_RELEASED = 'RELEASED';
    public const STATUS_REFUNDED = 'REFUNDED';
    public const STATUS_DISPUTED = 'DISPUTED';

    public function __construct(
        private EntityManagerInterface $em,
        private EscrowAuditLogger $auditLogger,
        private VendorWalletService $walletService,
        private PlatformFeeService $platformFeeService
    ) {}

    /* ============================================================
       CREATE ESCROW (CENTS SAFE)
       ============================================================ */

    public function createEscrow(
        Booking $booking,
        User $client,
        User $vendor,
        int $amountCents
    ): Escrow {

        if ($amountCents <= 0) {
            throw new \LogicException('Escrow amount must be positive.');
        }

        if ($booking->getEscrow()) {
            throw new \LogicException('Escrow already exists for this booking.');
        }

        return $this->em->wrapInTransaction(function () use (
            $booking,
            $client,
            $vendor,
            $amountCents
        ) {

            $escrow = new Escrow();
            $escrow->setBooking($booking);
            $escrow->setClient($client);
            $escrow->setVendor($vendor);
            $escrow->setAmountCents($amountCents);
            $escrow->setStatus(self::STATUS_HELD);
            $escrow->setCreatedAt(new \DateTimeImmutable());

            $this->em->persist($escrow);
            $this->em->flush();

            $this->auditLogger->log(
                $escrow,
                'ESCROW_CREATED',
                $client,
                ['amount_cents' => $amountCents]
            );

            return $escrow;
        });
    }

    /* ============================================================
       CLIENT RELEASE
       ============================================================ */

    public function releaseByClient(Escrow $escrow, User $client): void
    {
        $this->em->wrapInTransaction(function () use ($escrow, $client) {

            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            $this->assertState($escrow, self::STATUS_HELD);
            $this->assertOwnership($escrow->getClient(), $client);

            $amount = $escrow->getAmountCents();

            // Calculate platform fee
            $feeCents = $this->platformFeeService->calculateFee($amount);
            $vendorNet = $amount - $feeCents;

            // Credit vendor wallet
            $this->walletService->credit(
                user: $escrow->getVendor(),
                amountCents: $vendorNet,
                reference: 'ESCROW_RELEASE'
            );

            // Credit platform revenue ledger
            $this->platformFeeService->recordRevenue(
                amountCents: $feeCents,
                escrow: $escrow
            );

            $escrow->setStatus(self::STATUS_RELEASED);
            $escrow->setReleasedAt(new \DateTimeImmutable());

            $escrow->getBooking()->setStatus('completed');

            $this->auditLogger->log(
                $escrow,
                'ESCROW_RELEASED',
                $client,
                [
                    'gross_cents' => $amount,
                    'fee_cents'   => $feeCents,
                    'net_cents'   => $vendorNet
                ]
            );
        });
    }

    /* ============================================================
       DISPUTE
       ============================================================ */

    public function openDispute(Escrow $escrow, User $client, string $reason): void
    {
        if (trim($reason) === '') {
            throw new \LogicException('Dispute reason required.');
        }

        $this->em->wrapInTransaction(function () use ($escrow, $client, $reason) {

            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            $this->assertState($escrow, self::STATUS_HELD);
            $this->assertOwnership($escrow->getClient(), $client);

            $escrow->setStatus(self::STATUS_DISPUTED);
            $escrow->setDisputeReason($reason);
            $escrow->setDisputedAt(new \DateTimeImmutable());

            $this->auditLogger->log(
                $escrow,
                'ESCROW_DISPUTED',
                $client,
                ['reason' => $reason]
            );
        });
    }

    /* ============================================================
       ADMIN REFUND
       ============================================================ */

    public function refundByAdmin(Escrow $escrow, User $admin): void
    {
        $this->assertAdmin($admin);

        $this->em->wrapInTransaction(function () use ($escrow, $admin) {

            $this->em->lock($escrow, LockMode::PESSIMISTIC_WRITE);

            $this->assertState($escrow, self::STATUS_DISPUTED);

            $escrow->setStatus(self::STATUS_REFUNDED);
            $escrow->setResolvedAt(new \DateTimeImmutable());

            $escrow->getBooking()->setStatus('cancelled');

            // If external gateway refund is needed,
            // call payment gateway adapter here.

            $this->auditLogger->log(
                $escrow,
                'ESCROW_REFUNDED',
                $admin,
                ['amount_cents' => $escrow->getAmountCents()]
            );
        });
    }

    /* ============================================================
       GUARDS
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
}
