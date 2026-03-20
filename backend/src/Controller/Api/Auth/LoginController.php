<?php

namespace App\Controller\Api\Auth;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\AuthService;
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
    public function __invoke(
        Request $request,
        UserRepository $users,
        UserPasswordHasherInterface $hasher,
        AuthService $auth,
        #[Autowire(service: 'limiter.login')]
        RateLimiterFactory $apiLoginLimiter
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

        // 🔐 Rate limit per email
        $limiter = $apiLoginLimiter->create($email);

        if (!$limiter->consume()->isAccepted()) {
            return $this->json([
                'error' => 'Too many login attempts. Try again later.'
            ], 429);
        }

        $user = $users->findOneBy(['email' => $email]);

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

        return $this->json(
            $auth->login($user)
        );
    }
}
