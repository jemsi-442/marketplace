<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class HealthController extends AbstractController
{
    #[Route('/', name: 'app_root', methods: ['GET'])]
    public function root(): JsonResponse
    {
        return $this->json([
            'name' => 'Marketplace Backend API',
            'status' => 'ok',
            'message' => 'Backend is running. Use /health for a simple liveness check or /api/* with authentication.',
        ]);
    }

    #[Route('/health', name: 'app_health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        return $this->json([
            'status' => 'ok',
            'service' => 'marketplace-backend',
        ]);
    }
}
