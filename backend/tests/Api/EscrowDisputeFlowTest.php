<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\Booking;
use App\Entity\Escrow;
use App\Service\EscrowService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Response;

final class EscrowDisputeFlowTest extends ApiTestCase
{
    public function testClientDisputeRouteRejectsShortReasonAndStoresMeaningfulReason(): void
    {
        $ctx = $this->bootstrapActiveEscrowContext();

        $shortReasonResponse = $this->requestJson('POST', sprintf('/api/bookings/%d/escrow/dispute', $ctx['booking']->getId()), [
            'reason' => 'Too short',
        ], $ctx['clientToken']);

        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
        self::assertSame('reason must be at least 12 characters', $shortReasonResponse['error'] ?? null);

        $validReason = 'The delivered files do not match the approved scope and key pages are missing.';
        $validResponse = $this->requestJson('POST', sprintf('/api/bookings/%d/escrow/dispute', $ctx['booking']->getId()), [
            'reason' => $validReason,
        ], $ctx['clientToken']);

        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame('Escrow dispute opened', $validResponse['message'] ?? null);
        self::assertSame('DISPUTED', $validResponse['escrow_status'] ?? null);

        $snapshotJson = $this->db->fetchOne(
            'SELECT external_status_snapshot FROM escrow WHERE id = :id',
            ['id' => $ctx['escrow']->getId()]
        );

        self::assertIsString($snapshotJson);
        $snapshot = json_decode($snapshotJson, true, 512, JSON_THROW_ON_ERROR);
        self::assertSame($validReason, $snapshot['reason'] ?? null);
        self::assertSame('CLIENT_DASHBOARD', $snapshot['source'] ?? null);
    }

    public function testAdminResolveRouteStoresResolutionMetadata(): void
    {
        $ctx = $this->bootstrapActiveEscrowContext();

        $ctx['escrowService']->openDispute($ctx['escrow'], $ctx['clientUser'], [
            'reason' => 'The agreed deliverables are incomplete and admin review is needed.',
            'source' => 'TEST_FIXTURE',
        ]);

        $response = $this->requestJson('POST', sprintf('/api/admin/escrow/resolve/%d', $ctx['escrow']->getId()), [
            'release_to_vendor' => false,
            'resolution_note' => 'Refund approved because the delivery was materially incomplete.',
            'evidence_summary' => 'Client screenshots and missing asset checklist matched the dispute note.',
            'tags' => ['scope-mismatch', 'refund'],
        ], $ctx['adminToken']);

        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertSame('Escrow dispute resolved', $response['message'] ?? null);

        $snapshotJson = $this->db->fetchOne(
            'SELECT external_status_snapshot FROM escrow WHERE id = :id',
            ['id' => $ctx['escrow']->getId()]
        );

        self::assertIsString($snapshotJson);
        $snapshot = json_decode($snapshotJson, true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('Refund approved because the delivery was materially incomplete.', $snapshot['resolution_note'] ?? null);
        self::assertSame('Client screenshots and missing asset checklist matched the dispute note.', $snapshot['evidence_summary'] ?? null);
        self::assertSame(['scope-mismatch', 'refund'], $snapshot['tags'] ?? null);
        self::assertSame('CLIENT_REFUND_EXTERNAL', $snapshot['resolution'] ?? null);
    }

    /**
     * @return array{
     *   escrowService: EscrowService,
     *   escrow: Escrow,
     *   booking: Booking,
     *   clientUser: \App\Entity\User,
     *   adminUser: \App\Entity\User,
     *   clientToken: string,
     *   adminToken: string
     * }
     */
    private function bootstrapActiveEscrowContext(): array
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $clientRegistration = $this->registerUser("client_dispute_{$suffix}@test.com", $password, 'client');
        $vendorRegistration = $this->registerUser("vendor_dispute_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("admin_dispute_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($clientRegistration['verification_url']);
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->promoteUserToAdmin($adminRegistration['user']['email']);
        static::getContainer()->get(EntityManagerInterface::class)->clear();

        $clientUser = $this->reloadUserByEmail($clientRegistration['user']['email']);
        $vendorUser = $this->reloadUserByEmail($vendorRegistration['user']['email']);
        $adminUser = $this->reloadUserByEmail($adminRegistration['user']['email']);

        $clientLogin = $this->loginUser($clientRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        $booking = $this->createBookingFixture($clientUser, $vendorUser, 'Escrow Dispute Fixture');

        /** @var EscrowService $escrowService */
        $escrowService = static::getContainer()->get(EscrowService::class);
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $managedClientUser = $em->getRepository(\App\Entity\User::class)->find($clientUser->getId());
        $managedAdminUser = $em->getRepository(\App\Entity\User::class)->find($adminUser->getId());

        self::assertNotNull($managedClientUser);
        self::assertNotNull($managedAdminUser);

        $escrow = $escrowService->createEscrow($booking, $managedClientUser, 120000, 'TZS');
        $escrowService->handleCollectionWebhook([
            'reference' => $escrow->getReference(),
            'gateway_reference' => 'payref_dispute_' . $suffix,
            'status' => 'SUCCESS',
            'transaction_id' => 'txn_dispute_' . $suffix,
            'data' => [
                'reference' => 'payref_dispute_' . $suffix,
                'status' => 'success',
            ],
        ]);

        self::assertSame(Escrow::STATUS_ACTIVE, $escrow->getStatus());

        return [
            'escrowService' => $escrowService,
            'escrow' => $escrow,
            'booking' => $booking,
            'clientUser' => $managedClientUser,
            'adminUser' => $managedAdminUser,
            'clientToken' => $clientLogin['token'],
            'adminToken' => $adminLogin['token'],
        ];
    }

    private function createBookingFixture(\App\Entity\User $client, \App\Entity\User $vendor, string $serviceTitle): Booking
    {
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $managedClient = $em->getRepository(\App\Entity\User::class)->find($client->getId());
        $managedVendor = $em->getRepository(\App\Entity\User::class)->find($vendor->getId());

        self::assertNotNull($managedClient);
        self::assertNotNull($managedVendor);

        $booking = new Booking();
        $booking->setClient($managedClient);
        $booking->setAssignedVendor($managedVendor);
        $booking->setServiceTitleSnapshot($serviceTitle);
        $booking->setServiceCategorySnapshot('testing');
        $booking->setServicePriceSnapshotMinor(120000);
        $booking->setAgreedPriceMinor(120000);
        $booking->setCurrency('TZS');
        $booking->setStatus(Booking::STATUS_CONFIRMED);
        $booking->setRequestSummary('Need admin review dispute fixture coverage.');

        $em->persist($booking);
        $em->flush();

        return $booking;
    }
}
