<?php

declare(strict_types=1);

namespace App\Security;

use App\Repository\UserRepository;
use App\Service\JwtService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

final class JwtAuthenticator extends AbstractAuthenticator
{
    public function __construct(
        private JwtService $jwtService,
        private UserRepository $userRepository
    ) {}

    public function supports(Request $request): bool
    {
        $header = $request->headers->get('Authorization');
        return is_string($header) && str_starts_with($header, 'Bearer ');
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
        $subject = $payload['sub'];
        if (!is_scalar($subject)) {
            throw new CustomUserMessageAuthenticationException('Invalid token subject');
        }

        $path = $request->getPathInfo();

        return new SelfValidatingPassport(
            new UserBadge(
                (string) $subject,
                function (string $userIdentifier) use ($path) {
                    $user = $this->userRepository->find($userIdentifier);

                    if (!$user) {
                        throw new CustomUserMessageAuthenticationException('User not found');
                    }

                    if (!$user->isVerified() && !$this->isVerificationExemptPath($path)) {
                        throw new CustomUserMessageAuthenticationException('Email verification required');
                    }

                    return $user;
                }
            )
        );
    }

    public function onAuthenticationFailure(
        Request $request,
        AuthenticationException $exception
    ): JsonResponse {
        $message = $exception->getMessage();
        $statusCode = $message === 'Email verification required' ? 403 : 401;

        return new JsonResponse([
            'error' => 'authentication_failed',
            'message' => $message
        ], $statusCode);
    }

    public function onAuthenticationSuccess(
        Request $request,
        TokenInterface $token,
        string $firewallName
    ): ?JsonResponse {
        return null;
    }

    private function isVerificationExemptPath(string $path): bool
    {
        foreach ([
            '/api/login',
            '/api/register',
            '/api/auth/refresh',
            '/api/refresh',
            '/api/auth/verify-email',
        ] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
