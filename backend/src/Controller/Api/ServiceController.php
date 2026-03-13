<?php

namespace App\Controller\Api;

use App\Entity\Service;
use App\Entity\User;
use App\Entity\VendorProfile;
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

        $result = [];
        foreach ($services as $service) {
            $vendorUser = $service->getVendor()?->getUser();
            $result[] = [
                'id' => $service->getId(),
                'title' => $service->getTitle(),
                'description' => $service->getDescription(),
                'category' => $service->getCategory(),
                'price_cents' => $service->getPriceCents(),
                'is_active' => $service->isActive(),
                'vendor_user_id' => $vendorUser?->getId(),
            ];
        }

        return $this->json($result);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('ROLE_VENDOR')]
    public function create(
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $vendorProfile = $user->getVendorProfile();
        if (!$vendorProfile instanceof VendorProfile) {
            return $this->json(['error' => 'Vendor profile required before creating services'], 422);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['title'], $data['price'])) {
            return $this->json(['error' => 'title and price required'], 400);
        }

        $service = new Service();
        $service->setTitle($data['title']);
        $service->setDescription($data['description'] ?? null);
        $service->setCategory($data['category'] ?? null);
        $service->setPrice((float)$data['price']);
        $service->setVendor($vendorProfile);

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

        $vendorUser = $service->getVendor()?->getUser();

        return $this->json([
            'id' => $service->getId(),
            'title' => $service->getTitle(),
            'description' => $service->getDescription(),
            'category' => $service->getCategory(),
            'price_cents' => $service->getPriceCents(),
            'is_active' => $service->isActive(),
            'vendor_user_id' => $vendorUser?->getId(),
        ]);
    }

    #[Route('/{id}', methods: ['PUT'])]
    #[IsGranted('ROLE_VENDOR')]
    public function update(
        Service $service,
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($service->getVendor()?->getUser()?->getId() !== $user->getId()) {
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

        if (array_key_exists('category', $data)) {
            $service->setCategory($data['category'] !== null ? (string) $data['category'] : null);
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
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($service->getVendor()?->getUser()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Forbidden'], 403);
        }

        $service->deactivate();
        $em->flush();

        return $this->json(['message' => 'Service disabled']);
    }
}
