<?php

namespace App\Controller\Api;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/services')]
class ServiceController extends AbstractController
{
    private function retiredResponse(): JsonResponse
    {
        return $this->json([
            'error' => 'Vendor-owned service publishing was retired. Use service types, capability lanes, and the current request flow instead.',
        ], Response::HTTP_GONE);
    }

    #[Route('', methods: ['GET', 'POST'])]
    public function collection(): JsonResponse
    {
        return $this->retiredResponse();
    }

    #[Route('/{id}', methods: ['GET', 'PUT', 'DELETE'])]
    public function item(): JsonResponse
    {
        return $this->retiredResponse();
    }
}
