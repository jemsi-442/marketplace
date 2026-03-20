<?php

namespace App\Controller\Api;

use App\Entity\Service;
use App\Entity\User;
use App\Entity\VendorProfile;
use App\Repository\ServiceRepository;
use App\Security\ServiceVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/services')]
class ServiceController extends AbstractController
{
    /**
     * @param array<string, mixed> $data
     */
    private function resolvePriceCents(array $data): ?int
    {
        if (isset($data['price_cents']) && is_numeric($data['price_cents'])) {
            return max(0, (int) $data['price_cents']);
        }

        if (isset($data['price_minor']) && is_numeric($data['price_minor'])) {
            return max(0, (int) $data['price_minor']);
        }

        if (isset($data['price']) && is_numeric($data['price'])) {
            return max(0, (int) round(((float) $data['price']) * 100));
        }

        return null;
    }

    #[Route('', methods: ['GET'])]
    public function list(ServiceRepository $repository): JsonResponse
    {
        $services = $repository->findBy(['isActive' => true]);

        $result = [];
        foreach ($services as $service) {
            $vendorUser = $service->getVendor()->getUser();
            $result[] = [
                'id' => $service->getId(),
                'title' => $service->getTitle(),
                'description' => $service->getDescription(),
                'category' => $service->getCategory(),
                'price_cents' => $service->getPriceCents(),
                'is_active' => $service->isActive(),
                'vendor_user_id' => $vendorUser->getId(),
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
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }
        /** @var array<string, mixed> $data */

        $priceCents = $this->resolvePriceCents($data);
        $title = $data['title'] ?? null;
        if (!is_string($title) || $title === '' || $priceCents === null) {
            return $this->json(['error' => 'title and price_cents required'], 400);
        }

        if ($priceCents <= 0) {
            return $this->json(['error' => 'price_cents must be positive'], 400);
        }

        $service = new Service();
        $service->setTitle($title);
        $service->setDescription(isset($data['description']) && is_string($data['description']) ? $data['description'] : null);
        $service->setCategory(isset($data['category']) && is_string($data['category']) ? $data['category'] : null);
        $service->setPriceCents($priceCents);
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

        $vendorUser = $service->getVendor()->getUser();

        return $this->json([
            'id' => $service->getId(),
            'title' => $service->getTitle(),
            'description' => $service->getDescription(),
            'category' => $service->getCategory(),
            'price_cents' => $service->getPriceCents(),
            'is_active' => $service->isActive(),
            'vendor_user_id' => $vendorUser->getId(),
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

        $this->denyAccessUnlessGranted(ServiceVoter::UPDATE, $service);

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }
        /** @var array<string, mixed> $data */

        if (isset($data['title']) && is_string($data['title']) && $data['title'] !== '') {
            $service->setTitle($data['title']);
        }

        if (isset($data['description'])) {
            $service->setDescription(is_string($data['description']) ? $data['description'] : null);
        }

        $priceCents = $this->resolvePriceCents($data);
        if ($priceCents !== null) {
            if ($priceCents <= 0) {
                return $this->json(['error' => 'price_cents must be positive'], 400);
            }

            $service->setPriceCents($priceCents);
        }

        if (array_key_exists('category', $data)) {
            $category = $data['category'];
            $service->setCategory(is_string($category) ? $category : null);
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

        $this->denyAccessUnlessGranted(ServiceVoter::DELETE, $service);

        $service->deactivate();
        $em->flush();

        return $this->json(['message' => 'Service disabled']);
    }
}
