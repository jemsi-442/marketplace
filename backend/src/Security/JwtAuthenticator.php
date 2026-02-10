<?php

namespace App\Security;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\JwtService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;

class JwtAuthenticator extends AbstractAuthenticator
{
    public function __construct(
        private JwtService $jwtService,
        private UserRepository $userRepository,
        private EntityManagerInterface $em
    ) {}

    public function supports(Request $request): ?bool
    {
        return $request->headers->has('Authorization');
    }

    public function authenticate(Request $request)
    {
        $authHeader = $request->headers->get('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            throw new CustomUserMessageAuthenticationException('Missing Bearer token');
        }

        $token = substr($authHeader, 7);
        $payload = $this->jwtService->validate($token);

        if (!$payload) {
            throw new CustomUserMessageAuthenticationException('Invalid or expired token');
        }

        $userId = $payload['sub'] ?? null;
        if (!$userId) {
            throw new CustomUserMessageAuthenticationException('Invalid token payload');
        }

        $user = $this->userRepository->find($userId);
        if (!$user) {
            throw new CustomUserMessageAuthenticationException('User not found');
        }

        if ($user->getIsLocked()) {
            throw new CustomUserMessageAuthenticationException('Account is locked');
        }

        if (!$user->getIsVerified()) {
            throw new CustomUserMessageAuthenticationException('Email not verified');
        }

        // Return UserInterface for Symfony
        return new class($user) implements UserInterface {
            public function __construct(private User $user) {}
            public function getRoles(): array { return $this->user->getRoles(); }
            public function getPassword(): ?string { return $this->user->getPassword(); }
            public function getUserIdentifier(): string { return $this->user->getEmail(); }
            public function eraseCredentials(): void {}
        };
    }

    public function onAuthenticationSuccess(Request $request, $token, string $firewallName): ?JsonResponse
    {
        // Continue request without interruption
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?JsonResponse
    {
        return new JsonResponse([
            'error' => 'Authentication Failed',
            'message' => $exception->getMessage()
        ], 401);
    }
}
