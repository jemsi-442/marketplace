<?php

namespace App\Controller;

use App\Entity\Message;
use App\Entity\User;
use App\Repository\MessageRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/messages')]
class MessageController extends AbstractController
{
    #[Route('', name: 'message_send', methods: ['POST'])]
    public function send(
        Request $request,
        EntityManagerInterface $em,
        UserRepository $userRepo
    ): JsonResponse {
        $sender = $this->getUser();
        if (!$sender) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $receiverId = $data['receiverId'] ?? null;
        $content = trim($data['content'] ?? '');

        if (!$receiverId || !$content) {
            return $this->json(['error' => 'receiverId and content are required'], 400);
        }

        $receiver = $userRepo->find($receiverId);
        if (!$receiver) {
            return $this->json(['error' => 'Receiver not found'], 404);
        }

        $message = new Message();
        $message->setSender($sender);
        $message->setReceiver($receiver);
        $message->setContent($content);

        $em->persist($message);
        $em->flush();

        return $this->json([
            'message' => 'Message sent successfully',
            'data' => [
                'id' => $message->getId(),
                'senderId' => $sender->getId(),
                'receiverId' => $receiver->getId(),
                'content' => $message->getContent(),
                'createdAt' => $message->getCreatedAt()->format('Y-m-d H:i:s')
            ]
        ], 201);
    }

    #[Route('/inbox', name: 'message_inbox', methods: ['GET'])]
    public function inbox(MessageRepository $repo): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $messages = $repo->createQueryBuilder('m')
            ->where('m.receiver = :user')
            ->orWhere('m.sender = :user')
            ->setParameter('user', $user)
            ->orderBy('m.createdAt', 'DESC')
            ->getQuery()
            ->getResult();

        $result = [];
        foreach ($messages as $m) {
            $result[] = [
                'id' => $m->getId(),
                'senderId' => $m->getSender()->getId(),
                'senderEmail' => $m->getSender()->getEmail(),
                'receiverId' => $m->getReceiver()->getId(),
                'receiverEmail' => $m->getReceiver()->getEmail(),
                'content' => $m->getContent(),
                'createdAt' => $m->getCreatedAt()->format('Y-m-d H:i:s')
            ];
        }

        return $this->json(['messages' => $result]);
    }
}
