<?php

declare(strict_types=1);

namespace App\Controller\Api\Auth;

use App\Entity\User;
use App\Http\AuthCookies;
use App\Repository\UserRepository;
use App\Service\JwtService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class LogoutController extends AbstractController
{
    public function __construct(
        private readonly JwtService $jwtService,
        private readonly UserRepository $userRepository,
        private readonly AuthCookies $authCookies
    ) {}

    #[Route('/api/auth/logout', name: 'api_auth_logout', methods: ['POST'])]
    #[Route('/api/logout', name: 'api_logout', methods: ['POST'])]
    public function __invoke(Request $request): JsonResponse
    {
        $subject = $this->resolveUserId($request);

        if ($subject !== null) {
            /** @var User|null $user */
            $user = $this->userRepository->find($subject);
            if ($user) {
                $this->jwtService->revokeAll($user);
            }
        }

        return $this->authCookies->clearSessionCookies(new JsonResponse([
            'message' => 'Signed out',
        ]));
    }

    private function resolveUserId(Request $request): ?int
    {
        foreach ([
            $this->authCookies->getRefreshToken($request),
            $this->authCookies->getAccessToken($request),
        ] as $token) {
            if (!is_string($token) || $token === '') {
                continue;
            }

            $payload = $this->jwtService->validate($token);
            $subject = $payload['sub'] ?? null;

            if (is_int($subject)) {
                return $subject;
            }

            if (is_string($subject) && ctype_digit($subject)) {
                return (int) $subject;
            }
        }

        return null;
    }
}
