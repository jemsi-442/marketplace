<?php

namespace App\Controller\Api\Auth;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\JwtService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class RefreshTokenController extends AbstractController
{
    public function __construct(
        private JwtService $jwtService,
        private UserRepository $userRepository,
        private EntityManagerInterface $em
    ) {}

    #[Route('/api/auth/refresh', name: 'api_auth_refresh', methods: ['POST'])]
    public function refresh(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['refresh_token'])) {
            return new JsonResponse([
                'error' => 'Refresh token required'
            ], 400);
        }

        $refreshToken = $data['refresh_token'];

        // Validate signature + expiration first
        $payload = $this->jwtService->validate($refreshToken);

        if (!$payload || !isset($payload['sub'])) {
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

        // Perform secure refresh (rotation handled inside service)
        $tokens = $this->jwtService->refresh($user, $refreshToken);

        if (!$tokens) {
            return new JsonResponse([
                'error' => 'Refresh token mismatch or revoked'
            ], 401);
        }

        return new JsonResponse($tokens);
    }
}
