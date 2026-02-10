<?php

namespace App\Controller\Api;

use App\Entity\Service;
use App\Repository\ServiceRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/services')]
class ServiceController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    public function list(ServiceRepository $repository): JsonResponse
    {
        $services = $repository->findBy(['isActive' => true]);

        return $this->json($services);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('ROLE_VENDOR')]
    public function create(
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['title'], $data['price'])) {
            return $this->json(['error' => 'title and price required'], 400);
        }

        $service = new Service();
        $service->setTitle($data['title']);
        $service->setDescription($data['description'] ?? null);
        $service->setPrice((float)$data['price']);
        $service->setVendor($this->getUser());
        $service->setIsActive(true);
        $service->setCreatedAt(new \DateTimeImmutable());

        $em->persist($service);
        $em->flush();

        return $this->json([
            'id' => $service->getId(),
            'message' => 'Service created'
        ], 201);
    }

    #[Route('/{id}', methods: ['GET'])]
    public function show(Service $service): JsonResponse
    {
        if (!$service->isActive()) {
            return $this->json(['error' => 'Service not available'], 404);
        }

        return $this->json($service);
    }

    #[Route('/{id}', methods: ['PUT'])]
    #[IsGranted('ROLE_VENDOR')]
    public function update(
        Service $service,
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        if ($service->getVendor() !== $this->getUser()) {
            return $this->json(['error' => 'Forbidden'], 403);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['title'])) {
            $service->setTitle($data['title']);
        }

        if (isset($data['description'])) {
            $service->setDescription($data['description']);
        }

        if (isset($data['price'])) {
            $service->setPrice((float)$data['price']);
        }

        $em->flush();

        return $this->json(['message' => 'Service updated']);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    #[IsGranted('ROLE_VENDOR')]
    public function delete(
        Service $service,
        EntityManagerInterface $em
    ): JsonResponse {
        if ($service->getVendor() !== $this->getUser()) {
            return $this->json(['error' => 'Forbidden'], 403);
        }

        $service->setIsActive(false);
        $em->flush();

        return $this->json(['message' => 'Service disabled']);
    }
}
