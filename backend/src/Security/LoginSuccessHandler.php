<?php

namespace App\Security;

use App\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Http\Authentication\AuthenticationSuccessHandlerInterface;
use App\Service\JwtService;

class LoginSuccessHandler implements AuthenticationSuccessHandlerInterface
{
    private JwtService $jwtService;

    public function __construct(JwtService $jwtService)
    {
        $this->jwtService = $jwtService;
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token): JsonResponse
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return new JsonResponse([
                'status' => 'error',
                'message' => 'Authenticated user type is invalid.',
            ], 500);
        }

        $tokens = $this->jwtService->generateTokens($user, ip: $request->getClientIp(), userAgent: $request->headers->get('User-Agent'));

        return new JsonResponse([
            'status' => 'success',
            'token' => $tokens['access_token'],
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'expires_in' => $tokens['expires_in'],
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
            ],
        ]);
    }
}
