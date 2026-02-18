<?php

namespace App\Security;

use App\Repository\UserRepository;
use App\Service\JwtService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

final class JwtAuthenticator extends AbstractAuthenticator
{
    public function __construct(
        private JwtService $jwtService,
        private UserRepository $userRepository
    ) {}

    public function supports(Request $request): ?bool
    {
        $header = $request->headers->get('Authorization');
        return $header && str_starts_with($header, 'Bearer ');
    }

    public function authenticate(Request $request): Passport
    {
        $authHeader = $request->headers->get('Authorization');

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            throw new CustomUserMessageAuthenticationException('Missing Bearer token');
        }

        $jwt = substr($authHeader, 7);

        $payload = $this->jwtService->validate($jwt);

        if (!$payload || !isset($payload['sub'])) {
            throw new CustomUserMessageAuthenticationException('Invalid or expired token');
        }

        return new SelfValidatingPassport(
            new UserBadge(
                (string) $payload['sub'],
                function (string $userIdentifier) {
                    $user = $this->userRepository->find($userIdentifier);

                    if (!$user) {
                        throw new CustomUserMessageAuthenticationException('User not found');
                    }

                    return $user;
                }
            )
        );
    }

    public function onAuthenticationFailure(
        Request $request,
        AuthenticationException $exception
    ): ?JsonResponse {
        return new JsonResponse([
            'error' => 'authentication_failed',
            'message' => $exception->getMessage()
        ], 401);
    }

    public function onAuthenticationSuccess(
        Request $request,
        TokenInterface $token,
        string $firewallName
    ): ?JsonResponse {
        return null;
    }
}
