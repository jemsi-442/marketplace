<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Booking;
use App\Entity\ClientRequest;
use App\Entity\ServiceType;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/client')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
final class ClientDashboardController extends AbstractController
{
    private function isAdmin(User $user): bool
    {
        $roles = $user->getRoles();

        return in_array('ROLE_ADMIN', $roles, true) || in_array('ROLE_SUPER_ADMIN', $roles, true);
    }

    private function isVendor(User $user): bool
    {
        return in_array('ROLE_VENDOR', $user->getRoles(), true);
    }

    private function isClient(User $user): bool
    {
        return !$this->isAdmin($user) && !$this->isVendor($user);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeRecentBooking(Booking $booking): array
    {
        $escrow = $booking->getEscrow();

        return [
            'id' => $booking->getId(),
            'service_title' => $booking->resolveServiceTitle(),
            'service_category' => $booking->resolveServiceCategory(),
            'service_price_cents' => $booking->resolveChargeAmountMinor(),
            'request_summary' => $booking->getRequestSummary(),
            'scope_details' => $booking->getScopeDetails(),
            'deadline_note' => $booking->getDeadlineNote(),
            'vendor_user_id' => null,
            'client_id' => $booking->getClient()->getId(),
            'status' => $booking->getStatus(),
            'created_at' => $booking->getCreatedAt()->format('Y-m-d H:i:s'),
            'escrow' => $escrow ? [
                'id' => $escrow->getId(),
                'reference' => $escrow->getReference(),
                'status' => $escrow->getStatus(),
                'amount_minor' => $escrow->getAmountMinor(),
                'currency' => $escrow->getCurrency(),
                'disputed_at' => $escrow->getDisputedAt()?->format('Y-m-d H:i:s'),
                'resolved_at' => $escrow->getResolvedAt()?->format('Y-m-d H:i:s'),
            ] : null,
        ];
    }

    #[Route('/dashboard-summary', name: 'client_dashboard_summary', methods: ['GET'])]
    public function summary(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->isClient($user)) {
            return $this->json(['error' => 'Use the role-specific dashboard for this account'], 403);
        }

        $visibleLaneCount = (int) $em->getRepository(ServiceType::class)->count([
            'isActive' => true,
        ]);

        $requestBaseQb = $em->getRepository(ClientRequest::class)
            ->createQueryBuilder('cr')
            ->andWhere('cr.client = :client')
            ->setParameter('client', $user);

        $activeRequests = (int) (clone $requestBaseQb)
            ->select('COUNT(cr.id)')
            ->andWhere('cr.status NOT IN (:inactiveStatuses)')
            ->setParameter('inactiveStatuses', [
                ClientRequest::STATUS_COMPLETED,
                ClientRequest::STATUS_CANCELLED,
            ])
            ->getQuery()
            ->getSingleScalarResult();

        $awaitingPaymentRequests = (int) (clone $requestBaseQb)
            ->select('COUNT(cr.id)')
            ->andWhere('cr.status = :awaitingPaymentStatus')
            ->setParameter('awaitingPaymentStatus', ClientRequest::STATUS_AWAITING_PAYMENT)
            ->getQuery()
            ->getSingleScalarResult();

        $bookingBaseQb = $em->getRepository(Booking::class)
            ->createQueryBuilder('b')
            ->leftJoin('b.escrow', 'e')
            ->andWhere('b.client = :client')
            ->setParameter('client', $user);

        $trackedBookings = (int) (clone $bookingBaseQb)
            ->select('COUNT(DISTINCT b.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $activeBookings = (int) (clone $bookingBaseQb)
            ->select('COUNT(DISTINCT b.id)')
            ->andWhere('b.status <> :completedStatus')
            ->setParameter('completedStatus', Booking::STATUS_COMPLETED)
            ->getQuery()
            ->getSingleScalarResult();

        $protectedBookings = (int) (clone $bookingBaseQb)
            ->select('COUNT(DISTINCT b.id)')
            ->andWhere('e.status = :protectedStatus')
            ->setParameter('protectedStatus', 'ACTIVE')
            ->getQuery()
            ->getSingleScalarResult();

        $disputedBookings = (int) (clone $bookingBaseQb)
            ->select('COUNT(DISTINCT b.id)')
            ->andWhere('e.status = :disputedStatus')
            ->setParameter('disputedStatus', 'DISPUTED')
            ->getQuery()
            ->getSingleScalarResult();

        $protectedValueMinor = (int) ((clone $bookingBaseQb)
            ->select('COALESCE(SUM(e.amountMinor), 0)')
            ->andWhere('e.status IN (:protectedStatuses)')
            ->setParameter('protectedStatuses', ['ACTIVE', 'DISPUTED', 'RESOLVED', 'RELEASED'])
            ->getQuery()
            ->getSingleScalarResult() ?? 0);

        /** @var array<int, Booking> $recentBookings */
        $recentBookings = $em->getRepository(Booking::class)
            ->createQueryBuilder('b')
            ->leftJoin('b.escrow', 'e')
            ->addSelect('e')
            ->andWhere('b.client = :client')
            ->setParameter('client', $user)
            ->orderBy('b.createdAt', 'DESC')
            ->setMaxResults(6)
            ->getQuery()
            ->getResult();

        return $this->json([
            'visible_lane_count' => $visibleLaneCount,
            'active_requests' => $activeRequests,
            'awaiting_payment_requests' => $awaitingPaymentRequests,
            'tracked_bookings' => $trackedBookings,
            'active_bookings' => $activeBookings,
            'protected_bookings' => $protectedBookings,
            'disputed_bookings' => $disputedBookings,
            'protected_value_minor' => $protectedValueMinor,
            'currency' => 'TZS',
            'recent_bookings' => array_map(
                fn (Booking $booking): array => $this->serializeRecentBooking($booking),
                $recentBookings
            ),
        ]);
    }
}
