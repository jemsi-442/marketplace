<?php

declare(strict_types=1);

namespace App\Controller;

use App\Controller\Concerns\ListQueryParamsTrait;
use App\Entity\Notification;
use App\Entity\User;
use App\Repository\NotificationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/notifications')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class NotificationController extends AbstractController
{
    use ListQueryParamsTrait;

    private const ALLOWED_CATEGORIES = [
        Notification::CATEGORY_PLATFORM,
        Notification::CATEGORY_FINANCE,
        Notification::CATEGORY_ESCROW,
        Notification::CATEGORY_MESSAGE,
        Notification::CATEGORY_RISK,
    ];

    private function normalizeReadFilter(?string $value): string
    {
        return $value === 'unread' ? 'unread' : 'all';
    }

    private function normalizeCategoryFilter(?string $value): ?string
    {
        if ($value === null || $value === '' || $value === 'all') {
            return null;
        }

        return \in_array($value, self::ALLOWED_CATEGORIES, true) ? $value : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeNotification(Notification $notification): array
    {
        return [
            'id' => $notification->getId(),
            'title' => $notification->getTitle(),
            'message' => $notification->getMessage(),
            'category' => $notification->getCategory(),
            'isRead' => $notification->getIsRead(),
            'createdAt' => $notification->getCreatedAt()->format('Y-m-d H:i:s'),
        ];
    }

    #[Route('', name: 'notification_list', methods: ['GET'])]
    public function list(Request $request, NotificationRepository $repo): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $page = $this->readPage($request);
        $limit = $this->readListLimit($request, 10, 100);
        $readFilter = $this->normalizeReadFilter($request->query->get('view', $request->query->get('read_filter')));
        $categoryFilter = $this->normalizeCategoryFilter($request->query->get('category'));
        $search = trim((string) $request->query->get('search', ''));

        $baseQb = $repo->createQueryBuilder('n')
            ->where('n.user = :user')
            ->setParameter('user', $user);

        $totalItems = (int) (clone $baseQb)
            ->select('COUNT(n.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $unreadCount = (int) (clone $baseQb)
            ->select('COUNT(n.id)')
            ->andWhere('n.isRead = false')
            ->getQuery()
            ->getSingleScalarResult();

        $filteredQb = clone $baseQb;

        if ($readFilter === 'unread') {
            $filteredQb->andWhere('n.isRead = false');
        }

        if ($categoryFilter !== null) {
            $filteredQb
                ->andWhere('n.category = :category')
                ->setParameter('category', $categoryFilter);
        }

        if ($search !== '') {
            $filteredQb
                ->andWhere('(LOWER(n.title) LIKE :search OR LOWER(n.message) LIKE :search)')
                ->setParameter('search', '%' . mb_strtolower($search) . '%');
        }

        $visibleCount = (int) (clone $filteredQb)
            ->select('COUNT(n.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $totalPages = max(1, (int) ceil($visibleCount / $limit));
        $page = min($page, $totalPages);

        $notifications = $filteredQb
            ->orderBy('n.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        $result = [];
        foreach ($notifications as $n) {
            $result[] = $this->serializeNotification($n);
        }

        return $this->json([
            'items' => $result,
            'page' => $page,
            'page_size' => $limit,
            'total_items' => $visibleCount,
            'total_pages' => $totalPages,
            'summary' => [
                'total' => $totalItems,
                'unread' => $unreadCount,
                'visible' => $visibleCount,
            ],
        ]);
    }

    #[Route('/summary', name: 'notification_summary', methods: ['GET'])]
    public function summary(NotificationRepository $repo): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $baseQb = $repo->createQueryBuilder('n')
            ->where('n.user = :user')
            ->setParameter('user', $user);

        $totalItems = (int) (clone $baseQb)
            ->select('COUNT(n.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $unreadCount = (int) (clone $baseQb)
            ->select('COUNT(n.id)')
            ->andWhere('n.isRead = false')
            ->getQuery()
            ->getSingleScalarResult();

        return $this->json([
            'total' => $totalItems,
            'unread' => $unreadCount,
        ]);
    }

    #[Route('/read/{id}', name: 'notification_read', methods: ['POST'])]
    public function markRead(int $id, NotificationRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $notification = $repo->find($id);
        if (!$notification instanceof Notification) {
            return $this->json(['error' => 'Notification not found'], 404);
        }

        $notificationUser = $notification->getUser();
        if ($notificationUser->getId() !== $user->getId()) {
            return $this->json(['error' => 'Notification not found'], 404);
        }

        $notification->setIsRead(true);
        $em->flush();

        return $this->json([
            'message' => 'Notification marked as read',
            'notification' => $this->serializeNotification($notification),
        ]);
    }
}
