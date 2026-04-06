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
            'client' => 'ROLE_USER',
            'vendor' => 'ROLE_VENDOR',
            default => null,
        };

        if ($role === null) {
            return $this->json(['error' => 'Invalid account type'], 400);
        }

        try {
            $result = $auth->register($email, $password, $role);
            return $this->json($result, 201);
        } catch (\DomainException $e) {
            $statusCode = $e->getMessage() === 'Email already exists' ? 409 : 400;

            return $this->json(['error' => $e->getMessage()], $statusCode);
        } catch (\Throwable $e) {
            $payload = [
                'error' => 'server_error',
                'message' => 'Internal server error',
            ];

            if (filter_var($_SERVER['APP_DEBUG'] ?? getenv('APP_DEBUG') ?: false, FILTER_VALIDATE_BOOL)) {
                $payload['debug'] = [
                    'exception' => $e::class,
                    'detail' => $e->getMessage(),
                ];
            }

            return $this->json($payload, 500);
        }
    }
}
