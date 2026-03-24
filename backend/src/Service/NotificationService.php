<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Notification;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

final class NotificationService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function notify(
        User $user,
        string $title,
        string $message,
        string $category = Notification::CATEGORY_PLATFORM,
        bool $flush = true
    ): Notification
    {
        $notification = new Notification();
        $notification->setUser($user);
        $notification->setTitle($title);
        $notification->setMessage($message);
        $notification->setCategory($category);

        $this->em->persist($notification);

        if ($flush) {
            $this->em->flush();
        }

        return $notification;
    }

    /**
     * @param iterable<User> $users
     */
    public function notifyMany(
        iterable $users,
        string $title,
        string $message,
        string $category = Notification::CATEGORY_PLATFORM,
        bool $flush = true
    ): void
    {
        foreach ($users as $user) {
            $this->notify($user, $title, $message, $category, false);
        }

        if ($flush) {
            $this->em->flush();
        }
    }
}
