<?php

namespace App\Controller\Api\Auth;

use App\Service\AuthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/register', methods: ['POST'])]
final class RegisterController extends AbstractController
{
    public function __invoke(
        Request $request,
        AuthService $auth
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!$data || !isset($data['email'], $data['password'], $data['type'])) {
            return $this->json(['error' => 'Invalid payload'], 400);
        }

        $role = match ($data['type']) {
            'vendor' => 'ROLE_VENDOR',
            default => 'ROLE_USER',
        };

        try {
            return $this->json(
                $auth->register($data['email'], $data['password'], $role),
                201
            );
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 409);
        }
    }
}
