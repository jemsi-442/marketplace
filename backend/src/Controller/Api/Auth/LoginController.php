<?php

namespace App\Controller\Api\Auth;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\AuthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[Route('/api/login', methods: ['POST'])]
final class LoginController extends AbstractController
{
    public function __invoke(
        Request $request,
        UserRepository $users,
        UserPasswordHasherInterface $hasher,
        AuthService $auth,
        RateLimiterFactory $apiLoginLimiter
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!$data || !isset($data['email'], $data['password'])) {
            return $this->json(['error' => 'Invalid payload'], 400);
        }

        // 🔐 Rate limit per email
        $limiter = $apiLoginLimiter->create($data['email']);

        if (!$limiter->consume()->isAccepted()) {
            return $this->json([
                'error' => 'Too many login attempts. Try again later.'
            ], 429);
        }

        $user = $users->findOneBy(['email' => $data['email']]);

        if (!$user || !$hasher->isPasswordValid($user, $data['password'])) {
            return $this->json(['error' => 'Invalid credentials'], 401);
        }

        return $this->json(
            $auth->login($user)
        );
    }
}
