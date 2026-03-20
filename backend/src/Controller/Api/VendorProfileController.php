<?php

namespace App\Controller\Api;

use App\Entity\User;
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
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }
        $profile = $user->getVendorProfile();

        if (!$profile) {
            return $this->json([
                'exists' => false,
                'message' => 'Vendor profile not created'
            ]);
        }

        return $this->json([
            'exists' => true,
            'id' => $profile->getId(),
            'company_name' => $profile->getCompanyName(),
            'bio' => $profile->getBio(),
            'website' => $profile->getWebsite(),
            'portfolio_link' => $profile->getPortfolioLink(),
            'user_id' => $user->getId(),
        ]);
    }

    #[Route('', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($user->getVendorProfile()) {
            return $this->json([
                'error' => 'Vendor profile already exists'
            ], 409);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        if (!isset($data['companyName']) || !is_string($data['companyName']) || $data['companyName'] === '') {
            return $this->json([
                'error' => 'companyName is required'
            ], 400);
        }

        $profile = new VendorProfile();
        $profile->setUser($user);
        $profile->setCompanyName($data['companyName']);
        $profile->setBio(isset($data['bio']) && is_string($data['bio']) ? $data['bio'] : null);
        $profile->setWebsite(isset($data['website']) && is_string($data['website']) ? $data['website'] : null);
        $profile->setPortfolioLink(isset($data['portfolioLink']) && is_string($data['portfolioLink']) ? $data['portfolioLink'] : null);

        $em->persist($profile);
        $em->flush();

        return $this->json([
            'message' => 'Vendor profile created',
            'id' => $profile->getId(),
        ], 201);
    }

    #[Route('', methods: ['PUT'])]
    public function update(
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }
        $profile = $user->getVendorProfile();

        if (!$profile) {
            return $this->json([
                'error' => 'Vendor profile not found'
            ], 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        if (isset($data['companyName']) && is_string($data['companyName']) && $data['companyName'] !== '') {
            $profile->setCompanyName((string) $data['companyName']);
        }

        if (array_key_exists('bio', $data)) {
            $profile->setBio($data['bio'] !== null ? (string) $data['bio'] : null);
        }

        if (array_key_exists('website', $data)) {
            $profile->setWebsite($data['website'] !== null ? (string) $data['website'] : null);
        }

        if (array_key_exists('portfolioLink', $data)) {
            $profile->setPortfolioLink($data['portfolioLink'] !== null ? (string) $data['portfolioLink'] : null);
        }

        $em->flush();

        return $this->json([
            'message' => 'Vendor profile updated'
        ]);
    }
}
