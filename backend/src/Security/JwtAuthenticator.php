<?php

declare(strict_types=1);

namespace App\Security;

use App\Http\AuthCookies;
use App\Repository\UserRepository;
use App\Service\JwtService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

final class JwtAuthenticator extends AbstractAuthenticator implements AuthenticationEntryPointInterface
{
    public function __construct(
        private JwtService $jwtService,
        private UserRepository $userRepository,
        private AuthCookies $authCookies
    ) {}

    public function supports(Request $request): bool
    {
        if ($this->isAuthenticatorBypassedPath($request->getPathInfo())) {
            return false;
        }

        return str_starts_with($request->getPathInfo(), '/api');
    }

    public function authenticate(Request $request): Passport
    {
        $authHeader = $request->headers->get('Authorization');
        $jwt = null;

        if (is_string($authHeader) && str_starts_with($authHeader, 'Bearer ')) {
            $jwt = substr($authHeader, 7);
        }

        if (!$jwt) {
            $jwt = $this->authCookies->getAccessToken($request);
        }

        if (!is_string($jwt) || $jwt === '') {
            throw new CustomUserMessageAuthenticationException('Missing access token');
        }

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

    public function start(Request $request, ?AuthenticationException $authException = null): Response
    {
        return new JsonResponse([
            'error' => 'authentication_required',
            'message' => 'Authentication required',
        ], 401);
    }

    private function isVerificationExemptPath(string $path): bool
    {
        foreach ([
            '/api/login',
            '/api/register',
            '/api/auth/refresh',
            '/api/refresh',
            '/api/auth/verify-email',
            '/api/auth/oauth',
        ] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }

        return false;
    }

    private function isAuthenticatorBypassedPath(string $path): bool
    {
        foreach ([
            '/api/login',
            '/api/register',
            '/api/auth/refresh',
            '/api/refresh',
            '/api/auth/verify-email',
            '/api/auth/resend-verification',
            '/api/auth/oauth',
            '/api/auth/logout',
            '/api/logout',
        ] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
