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
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/messages')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class MessageController extends AbstractController
{
    #[Route('', name: 'message_send', methods: ['POST'])]
    public function send(
        Request $request,
        EntityManagerInterface $em,
        UserRepository $userRepo
    ): JsonResponse {
        $sender = $this->getUser();
        if (!$sender instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $receiverId = $data['receiverId'] ?? null;
        $contentValue = $data['content'] ?? '';
        $content = is_string($contentValue) ? trim($contentValue) : '';

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
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        /** @var array<int, Message> $messages */
        $messages = $repo->createQueryBuilder('m')
            ->where('m.receiver = :user')
            ->orWhere('m.sender = :user')
            ->setParameter('user', $user)
            ->orderBy('m.createdAt', 'DESC')
            ->getQuery()
            ->getResult();

        $result = [];
        foreach ($messages as $m) {
            $sender = $m->getSender();
            $receiver = $m->getReceiver();

            $result[] = [
                'id' => $m->getId(),
                'senderId' => $sender->getId(),
                'senderEmail' => $sender->getEmail(),
                'receiverId' => $receiver->getId(),
                'receiverEmail' => $receiver->getEmail(),
                'content' => $m->getContent(),
                'createdAt' => $m->getCreatedAt()->format('Y-m-d H:i:s')
            ];
        }

        return $this->json(['messages' => $result]);
    }
}
