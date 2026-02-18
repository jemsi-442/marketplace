<?php

namespace App\Controller\Api;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/protected')]
class ProtectedController extends AbstractController
{
    /**
     * Basic authenticated route
     * Requires valid JWT access token
     */
    #[Route('/me', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function me(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'is_verified' => $user->isVerified(),
            'created_at' => $user->getCreatedAt()?->format('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Test secured endpoint
     */
    #[Route('/ping', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function ping(): JsonResponse
    {
        return $this->json([
            'status' => 'ok',
            'message' => 'Access token valid',
            'timestamp' => (new \DateTimeImmutable())->format('Y-m-d H:i:s')
        ]);
    }

    /**
     * Admin-only endpoint
     */
    #[Route('/admin-check', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adminCheck(): JsonResponse
    {
        return $this->json([
            'message' => 'Admin access granted'
        ]);
    }
}
