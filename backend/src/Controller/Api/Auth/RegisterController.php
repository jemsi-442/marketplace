<?php

namespace App\Controller\Api\Auth;

use App\Service\AuthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/register', methods: ['POST'])]
final class RegisterController extends AbstractController
{
    public function __invoke(
        Request $request,
        AuthService $auth
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid payload'], 400);
        }

        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $type = $data['type'] ?? null;
        if (!is_string($email) || !is_string($password) || !is_string($type) || $email === '' || $password === '' || $type === '') {
            return $this->json(['error' => 'Invalid payload'], 400);
        }

        $role = match ($type) {
            'vendor' => 'ROLE_VENDOR',
            default => 'ROLE_USER',
        };

        try {
            return $this->json(
                $auth->register($email, $password, $role),
                201
            );
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 409);
        }
    }
}
