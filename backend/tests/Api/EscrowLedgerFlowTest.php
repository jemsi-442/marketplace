<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\Booking;
use App\Entity\Service as MarketplaceService;
use App\Entity\VendorProfile;
use App\Service\EscrowService;
use App\Service\VendorWalletService;
use Doctrine\ORM\EntityManagerInterface;

final class EscrowLedgerFlowTest extends ApiTestCase
{
    public function testFundedEscrowReleaseCreditsVendorAndPlatformRevenue(): void
    {
        $ctx = $this->bootstrapActiveEscrow();
        $escrowService = $ctx['escrowService'];
        $walletService = $ctx['walletService'];
        $escrow = $ctx['escrow'];
        $clientUser = $ctx['clientUser'];
        $vendorUser = $ctx['vendorUser'];
        $booking = $ctx['booking'];
        $liabilityBefore = $ctx['liabilityBefore'];
        $platformRevenueBefore = $ctx['platformRevenueBefore'];

        self::assertSame(
            '2',
            (string) $this->db->fetchOne(
                'SELECT COUNT(*) FROM wallet_ledger_entry WHERE reference = :reference',
                ['reference' => $escrow->getReference()]
            )
        );
        self::assertSame(0, $walletService->getVendorBalance($vendorUser, 'TZS'));
        self::assertSame(
            $liabilityBefore + 120000,
            $this->signedBalanceForAccountCode(VendorWalletService::ESCROW_LIABILITY_CODE . '_TZS')
        );

        $escrowService->releaseByClient($escrow, $clientUser);

        self::assertSame('RELEASED', $escrow->getStatus());
        self::assertSame(Booking::STATUS_COMPLETED, $booking->getStatus());
        self::assertSame(108000, $walletService->getVendorBalance($vendorUser, 'TZS'));
        self::assertSame(
            $platformRevenueBefore + 12000,
            $this->signedBalanceForAccountCode(VendorWalletService::PLATFORM_REVENUE_CODE . '_TZS')
        );
        self::assertSame(
            $liabilityBefore,
            $this->signedBalanceForAccountCode(VendorWalletService::ESCROW_LIABILITY_CODE . '_TZS')
        );
        self::assertSame(
            '6',
            (string) $this->db->fetchOne(
                'SELECT COUNT(*) FROM wallet_ledger_entry WHERE reference = :reference',
                ['reference' => $escrow->getReference()]
            )
        );
        self::assertSame(
            '1',
            (string) $this->db->fetchOne(
                'SELECT COUNT(*) FROM escrow_audit_logs WHERE escrow_id = :escrow_id AND action = :action',
                [
                    'escrow_id' => $escrow->getId(),
                    'action' => 'ESCROW_RELEASED',
                ]
            )
        );
    }

    public function testDisputedEscrowResolvedToVendorReleasesLedgerAndCompletesBooking(): void
    {
        $ctx = $this->bootstrapActiveEscrow();
        $escrowService = $ctx['escrowService'];
        $walletService = $ctx['walletService'];
        $escrow = $ctx['escrow'];
        $clientUser = $ctx['clientUser'];
        $vendorUser = $ctx['vendorUser'];
        $adminUser = $ctx['adminUser'];
        $booking = $ctx['booking'];
        $liabilityBefore = $ctx['liabilityBefore'];
        $platformRevenueBefore = $ctx['platformRevenueBefore'];

        $escrowService->openDispute($escrow, $clientUser, ['reason' => 'quality_issue']);
        self::assertSame('DISPUTED', $escrow->getStatus());

        $escrowService->resolveDispute($escrow, $adminUser, true, ['admin_note' => 'release_to_vendor']);

        self::assertSame('RESOLVED', $escrow->getStatus());
        self::assertSame(Booking::STATUS_COMPLETED, $booking->getStatus());
        self::assertSame(108000, $walletService->getVendorBalance($vendorUser, 'TZS'));
        self::assertSame(
            $platformRevenueBefore + 12000,
            $this->signedBalanceForAccountCode(VendorWalletService::PLATFORM_REVENUE_CODE . '_TZS')
        );
        self::assertSame(
            $liabilityBefore,
            $this->signedBalanceForAccountCode(VendorWalletService::ESCROW_LIABILITY_CODE . '_TZS')
        );
        self::assertSame(
            '6',
            (string) $this->db->fetchOne(
                'SELECT COUNT(*) FROM wallet_ledger_entry WHERE reference = :reference',
                ['reference' => $escrow->getReference()]
            )
        );
        self::assertSame(
            '1',
            (string) $this->db->fetchOne(
                'SELECT COUNT(*) FROM escrow_audit_logs WHERE escrow_id = :escrow_id AND action = :action',
                [
                    'escrow_id' => $escrow->getId(),
                    'action' => 'ESCROW_RESOLVED',
                ]
            )
        );
    }

    public function testDisputedEscrowResolvedToClientRefundClearsLiabilityWithoutCreditingVendor(): void
    {
        $ctx = $this->bootstrapActiveEscrow();
        $escrowService = $ctx['escrowService'];
        $walletService = $ctx['walletService'];
        $escrow = $ctx['escrow'];
        $clientUser = $ctx['clientUser'];
        $vendorUser = $ctx['vendorUser'];
        $adminUser = $ctx['adminUser'];
        $booking = $ctx['booking'];
        $liabilityBefore = $ctx['liabilityBefore'];
        $platformRevenueBefore = $ctx['platformRevenueBefore'];
        $settlementBefore = $ctx['settlementBefore'];

        $escrowService->openDispute($escrow, $clientUser, ['reason' => 'refund_requested']);
        self::assertSame('DISPUTED', $escrow->getStatus());

        $escrowService->resolveDispute($escrow, $adminUser, false, ['admin_note' => 'refund_to_client']);

        self::assertSame('RESOLVED', $escrow->getStatus());
        self::assertSame(Booking::STATUS_CANCELLED, $booking->getStatus());
        self::assertSame(0, $walletService->getVendorBalance($vendorUser, 'TZS'));
        self::assertSame(
            $platformRevenueBefore,
            $this->signedBalanceForAccountCode(VendorWalletService::PLATFORM_REVENUE_CODE . '_TZS')
        );
        self::assertSame(
            $liabilityBefore,
            $this->signedBalanceForAccountCode(VendorWalletService::ESCROW_LIABILITY_CODE . '_TZS')
        );
        self::assertSame(
            $settlementBefore,
            $this->signedBalanceForAccountCode(VendorWalletService::SNIPPE_SETTLEMENT_CODE . '_TZS')
        );
        self::assertSame(
            '4',
            (string) $this->db->fetchOne(
                'SELECT COUNT(*) FROM wallet_ledger_entry WHERE reference = :reference',
                ['reference' => $escrow->getReference()]
            )
        );
    }

    /**
     * @return array{
     *   escrowService: EscrowService,
     *   walletService: VendorWalletService,
     *   escrow: \App\Entity\Escrow,
     *   clientUser: \App\Entity\User,
     *   vendorUser: \App\Entity\User,
     *   adminUser: \App\Entity\User,
     *   booking: Booking,
     *   liabilityBefore: int,
     *   platformRevenueBefore: int,
     *   settlementBefore: int
     * }
     */
    private function bootstrapActiveEscrow(): array
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("client_escrow_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("vendor_escrow_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("admin_escrow_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->promoteUserToAdmin($adminRegistration['user']['email']);
        static::getContainer()->get(EntityManagerInterface::class)->clear();

        $clientUser = $this->reloadUserByEmail($clientRegistration['user']['email']);
        $vendorUser = $this->reloadUserByEmail($vendorRegistration['user']['email']);
        $adminUser = $this->reloadUserByEmail($adminRegistration['user']['email']);

        $booking = $this->createBookingFixture($clientUser, $vendorUser, 'Escrow Release Fixture');

        /** @var EscrowService $escrowService */
        $escrowService = static::getContainer()->get(EscrowService::class);
        /** @var VendorWalletService $walletService */
        $walletService = static::getContainer()->get(VendorWalletService::class);
        $liabilityBefore = $this->signedBalanceForAccountCode(VendorWalletService::ESCROW_LIABILITY_CODE . '_TZS');
        $platformRevenueBefore = $this->signedBalanceForAccountCode(VendorWalletService::PLATFORM_REVENUE_CODE . '_TZS');
        $settlementBefore = $this->signedBalanceForAccountCode(VendorWalletService::SNIPPE_SETTLEMENT_CODE . '_TZS');

        $escrow = $escrowService->createEscrow($booking, $clientUser, 120000, 'TZS');
        self::assertSame('CREATED', $escrow->getStatus());

        $escrowService->handleCollectionWebhook([
            'reference' => $escrow->getReference(),
            'gateway_reference' => 'payref_' . $suffix,
            'status' => 'SUCCESS',
            'transaction_id' => 'txn_escrow_' . $suffix,
            'data' => [
                'reference' => 'payref_' . $suffix,
                'status' => 'success',
            ],
        ]);

        self::assertSame('ACTIVE', $escrow->getStatus());

        return [
            'escrowService' => $escrowService,
            'walletService' => $walletService,
            'escrow' => $escrow,
            'clientUser' => $clientUser,
            'vendorUser' => $vendorUser,
            'adminUser' => $adminUser,
            'booking' => $booking,
            'liabilityBefore' => $liabilityBefore,
            'platformRevenueBefore' => $platformRevenueBefore,
            'settlementBefore' => $settlementBefore,
        ];
    }

    private function createBookingFixture(\App\Entity\User $client, \App\Entity\User $vendor, string $serviceTitle): Booking
    {
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $vendorProfile = new VendorProfile();
        $vendorProfile->setUser($vendor);
        $vendorProfile->setCompanyName('Escrow Fixture Vendor');

        $service = new MarketplaceService();
        $service->setVendor($vendorProfile);
        $service->setTitle($serviceTitle);
        $service->setDescription('Escrow ledger integration fixture');
        $service->setCategory('testing');
        $service->setPriceCents(120000);

        $booking = new Booking();
        $booking->setClient($client);
        $booking->setService($service);
        $booking->setStatus(Booking::STATUS_CONFIRMED);

        $em->persist($vendorProfile);
        $em->persist($service);
        $em->persist($booking);
        $em->flush();

        return $booking;
    }

    private function signedBalanceForAccountCode(string $accountCode): int
    {
        return (int) $this->db->fetchOne(
            <<<'SQL'
SELECT COALESCE(SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount_minor ELSE -le.amount_minor END), 0)
FROM wallet_ledger_entry le
INNER JOIN wallet_account wa ON wa.id = le.account_id
WHERE wa.account_code = :code
SQL,
            ['code' => $accountCode]
        );
    }
}
