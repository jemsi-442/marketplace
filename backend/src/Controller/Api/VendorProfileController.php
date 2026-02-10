<?php

namespace App\Controller\Api;

use App\Entity\VendorProfile;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/vendor/profile')]
#[IsGranted('ROLE_VENDOR')]
class VendorProfileController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    public function view(): JsonResponse
    {
        $user = $this->getUser();
        $profile = $user->getVendorProfile();

        if (!$profile) {
            return $this->json([
                'exists' => false,
                'message' => 'Vendor profile not created'
            ]);
        }

        return $this->json($profile);
    }

    #[Route('', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();

        if ($user->getVendorProfile()) {
            return $this->json([
                'error' => 'Vendor profile already exists'
            ], 409);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['businessName'])) {
            return $this->json([
                'error' => 'businessName is required'
            ], 400);
        }

        $profile = new VendorProfile();
        $profile->setUser($user);
        $profile->setBusinessName($data['businessName']);
        $profile->setDescription($data['description'] ?? null);
        $profile->setLocation($data['location'] ?? null);
        $profile->setVerified(false);
        $profile->setCreatedAt(new \DateTimeImmutable());

        $em->persist($profile);
        $em->flush();

        return $this->json([
            'message' => 'Vendor profile created'
        ], 201);
    }

    #[Route('', methods: ['PUT'])]
    public function update(
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        $profile = $user->getVendorProfile();

        if (!$profile) {
            return $this->json([
                'error' => 'Vendor profile not found'
            ], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['businessName'])) {
            $profile->setBusinessName($data['businessName']);
        }

        if (isset($data['description'])) {
            $profile->setDescription($data['description']);
        }

        if (isset($data['location'])) {
            $profile->setLocation($data['location']);
        }

        $em->flush();

        return $this->json([
            'message' => 'Vendor profile updated'
        ]);
    }
}
