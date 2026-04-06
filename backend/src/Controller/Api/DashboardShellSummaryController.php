<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Escrow;
use App\Entity\Notification;
use App\Entity\User;
use App\Entity\VendorServiceCapability;
use App\Repository\MessageRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/dashboard')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
final class DashboardShellSummaryController extends AbstractController
{
    private function isAdmin(User $user): bool
    {
        $roles = $user->getRoles();

        return in_array('ROLE_ADMIN', $roles, true) || in_array('ROLE_SUPER_ADMIN', $roles, true);
    }

    #[Route('/shell-summary', name: 'dashboard_shell_summary', methods: ['GET'])]
    public function summary(EntityManagerInterface $em, MessageRepository $messageRepository): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $notificationUnread = (int) $em->getRepository(Notification::class)
            ->createQueryBuilder('n')
            ->select('COUNT(n.id)')
            ->where('n.user = :user')
            ->andWhere('n.isRead = false')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();

        if ($this->isAdmin($user)) {
            $requestUnread = count($messageRepository->countUnreadRequestThreadsForAdmin($user));
            $bookingUnread = count($messageRepository->countUnreadBookingThreadsForAdmin($user));
            $pendingCapabilities = (int) $em->getRepository(VendorServiceCapability::class)
                ->createQueryBuilder('c')
                ->select('COUNT(c.id)')
                ->andWhere('c.approvedByAdmin = false')
                ->andWhere('c.reviewedAt IS NULL')
                ->getQuery()
                ->getSingleScalarResult();
            $disputedEscrows = (int) $em->getRepository(Escrow::class)
                ->createQueryBuilder('e')
                ->select('COUNT(e.id)')
                ->where('e.status = :status')
                ->setParameter('status', Escrow::STATUS_DISPUTED)
                ->getQuery()
                ->getSingleScalarResult();
        } else {
            $requestUnread = $messageRepository->countUnreadRequestThreadsForUser($user);
            $bookingUnread = $messageRepository->countUnreadBookingThreadsForUser($user);
            $pendingCapabilities = 0;
            $disputedEscrows = 0;
        }

        return $this->json([
            'notifications_unread' => $notificationUnread,
            'request_threads_unread' => $requestUnread,
            'booking_threads_unread' => $bookingUnread,
            'inbox_total_unread' => $requestUnread + $bookingUnread,
            'admin_pending_capabilities' => $pendingCapabilities,
            'admin_disputed_escrows' => $disputedEscrows,
        ]);
    }
}
