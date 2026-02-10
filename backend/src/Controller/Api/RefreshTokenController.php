<?php

namespace App\Controller\Api;

use App\Repository\UserRepository;
use App\Service\JwtService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class RefreshTokenController extends AbstractController
{
    public function __construct(
        private JwtService $jwtService,
        private UserRepository $userRepository,
        private EntityManagerInterface $em
    ) {}

    #[Route('/api/refresh', name: 'api_refresh_token', methods: ['POST'])]
    public function refresh(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['refresh_token'])) {
            return new JsonResponse([
                'error' => 'Refresh token required'
            ], 400);
        }

        $oldRefreshToken = $data['refresh_token'];

        // Validate signature + expiration
        $payload = $this->jwtService->validate($oldRefreshToken);

        if (!$payload || ($payload['type'] ?? null) !== 'refresh') {
            return new JsonResponse([
                'error' => 'Invalid or expired refresh token'
            ], 401);
        }

        $userId = $payload['sub'] ?? null;

        if (!$userId) {
            return new JsonResponse([
                'error' => 'Invalid token payload'
            ], 401);
        }

        $user = $this->userRepository->find($userId);

        if (!$user) {
            return new JsonResponse([
                'error' => 'User not found'
            ], 404);
        }

        if ($user->getIsLocked()) {
            return new JsonResponse([
                'error' => 'Account is locked'
            ], 403);
        }

        if (!$user->getIsVerified()) {
            return new JsonResponse([
                'error' => 'Email not verified'
            ], 403);
        }

        // 🔐 Rotation Security Check
        if ($user->getRefreshToken() !== $oldRefreshToken) {
            return new JsonResponse([
                'error' => 'Refresh token revoked'
            ], 401);
        }

        // 🔁 Generate NEW tokens
        $newAccessToken = $this->jwtService->generate([
            'sub' => $user->getId(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
        ]);

        $newRefreshToken = $this->jwtService->generate([
            'sub' => $user->getId(),
            'type' => 'refresh'
        ], ttl: 60 * 60 * 24 * 30); // 30 days

        // 🔥 Invalidate old token by overwriting
        $user->setRefreshToken($newRefreshToken);
        $this->em->flush();

        return new JsonResponse([
            'message' => 'Token rotated successfully',
            'access_token' => $newAccessToken,
            'refresh_token' => $newRefreshToken
        ]);
    }
}
