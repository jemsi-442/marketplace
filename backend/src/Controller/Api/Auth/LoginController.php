<?php

namespace App\Controller\Api\Auth;

use App\Http\AuthCookies;
use App\Repository\UserRepository;
use App\Service\AuthService;
use App\Service\JwtService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[Route('/api/login', methods: ['POST'])]
final class LoginController extends AbstractController
{
    public function __construct(
        #[Autowire(service: 'limiter.login')]
        private readonly RateLimiterFactory $apiLoginLimiter,
    ) {
    }

    public function __invoke(
        Request $request,
        UserRepository $users,
        UserPasswordHasherInterface $hasher,
        AuthService $auth,
        JwtService $jwtService,
        AuthCookies $authCookies
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid payload'], 400);
        }

        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        if (!is_string($email) || !is_string($password) || $email === '' || $password === '') {
            return $this->json(['error' => 'Invalid payload'], 400);
        }

        $normalizedEmail = strtolower(trim($email));
        $ipAddress = $request->getClientIp() ?? 'unknown';

        // Rate limit by email plus source IP to reduce account-targeted lockout abuse.
        $limiter = $this->apiLoginLimiter->create(sprintf('%s|%s', $normalizedEmail, $ipAddress));

        if (!$limiter->consume()->isAccepted()) {
            return $this->json([
                'error' => 'Too many login attempts. Try again later.'
            ], 429);
        }

        $user = $users->findOneBy(['email' => $normalizedEmail]);

        if (!$user || !$hasher->isPasswordValid($user, $password)) {
            return $this->json(['error' => 'Invalid credentials'], 401);
        }

        if ($user->isLocked()) {
            return $this->json(['error' => 'Account is locked'], 403);
        }

        if (!$user->isVerified()) {
            return $this->json([
                'error' => 'Email not verified',
                'verification_required' => true,
            ], 403);
        }

        $session = $auth->login($user);

        $response = $this->json([
            'expires_in' => $session['expires_in'],
            'user' => $session['user'],
        ]);

        return $authCookies->attachSessionCookies($response, [
            'access_token' => $session['token'],
            'refresh_token' => $session['refresh_token'],
            'expires_in' => $session['expires_in'],
        ], $jwtService->getRefreshTtl());
    }
}
