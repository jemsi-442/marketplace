<?php

declare(strict_types=1);

namespace App\Controller\Api\Auth;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\JwtService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class RefreshTokenController extends AbstractController
{
    public function __construct(
        private readonly JwtService $jwtService,
        private readonly UserRepository $userRepository
    ) {}

    #[Route('/api/auth/refresh', name: 'api_auth_refresh', methods: ['POST'])]
    #[Route('/api/refresh', name: 'api_refresh_token', methods: ['POST'])]
    public function refresh(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return new JsonResponse(['error' => 'Invalid JSON payload'], 400);
        }

        $refreshToken = $data['refresh_token'] ?? null;
        if (!is_string($refreshToken) || $refreshToken === '') {
            return new JsonResponse([
                'error' => 'Refresh token required'
            ], 400);
        }

        // Validate signature + expiration first
        $payload = $this->jwtService->validate($refreshToken);

        if (!$payload || ($payload['type'] ?? null) !== 'refresh' || !isset($payload['sub'])) {
            return new JsonResponse([
                'error' => 'Invalid or expired refresh token'
            ], 401);
        }

        /** @var User|null $user */
        $user = $this->userRepository->find($payload['sub']);

        if (!$user) {
            return new JsonResponse([
                'error' => 'User not found'
            ], 404);
        }

        if ($user->isLocked()) {
            return new JsonResponse([
                'error' => 'Account is locked'
            ], 403);
        }

        if (!$user->isVerified()) {
            return new JsonResponse([
                'error' => 'Email not verified',
                'verification_required' => true,
            ], 403);
        }

        // Perform secure refresh (rotation handled inside service)
        $tokens = $this->jwtService->refresh($refreshToken);

        if (!$tokens) {
            return new JsonResponse([
                'error' => 'Refresh token mismatch or revoked'
            ], 401);
        }

        return new JsonResponse($tokens);
    }
}
