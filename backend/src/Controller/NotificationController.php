<?php

namespace App\Controller;

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
    #[Route('', name: 'notification_list', methods: ['GET'])]
    public function list(NotificationRepository $repo): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $notifications = $repo->findBy(['user' => $user], ['createdAt' => 'DESC']);
        $result = [];
        foreach ($notifications as $n) {
            $result[] = [
                'id' => $n->getId(),
                'title' => $n->getTitle(),
                'message' => $n->getMessage(),
                'isRead' => $n->getIsRead(),
                'createdAt' => $n->getCreatedAt()->format('Y-m-d H:i:s'),
            ];
        }

        return $this->json(['notifications' => $result]);
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

        return $this->json(['message' => 'Notification marked as read']);
    }
}
