<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\PlatformMetricsHealthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/metrics')]
#[IsGranted('ROLE_ADMIN')]
class AdminMetricsController extends AbstractController
{
    public function __construct(private readonly PlatformMetricsHealthService $metricsHealthService)
    {
    }

    #[Route('/health', name: 'admin_metrics_health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        $data = $this->metricsHealthService->getHealthStatus();
        $statusCode = $data['is_healthy'] ? 200 : 503;

        return $this->json($data, $statusCode);
    }

    #[Route('/trend', name: 'admin_metrics_trend', methods: ['GET'])]
    public function trend(Request $request): JsonResponse
    {
        $days = (int) $request->query->get('days', 30);

        return $this->json($this->metricsHealthService->getTrend($days));
    }
}
