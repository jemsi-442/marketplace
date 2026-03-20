<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Entity\VendorProfile;
use App\Entity\Booking;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin')]
#[IsGranted('ROLE_ADMIN')]
final class AdminController extends AbstractController
{
    #[Route('/users', name: 'admin_users_list', methods: ['GET'])]
    public function listUsers(EntityManagerInterface $em): JsonResponse
    {
        $users = $em->getRepository(User::class)->findAll();
        $result = [];

        foreach ($users as $user) {
            $result[] = [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
                'is_verified' => $user->isVerified(),
                'is_locked' => $user->isLocked(),
            ];
        }

        return $this->json($result);
    }

    #[Route('/users/{id}/lock', name: 'admin_user_lock', methods: ['POST'])]
    public function lockUser(User $user, EntityManagerInterface $em): JsonResponse
    {
        $user->setIsLocked(true);
        $em->flush();

        return $this->json(['message' => 'User account locked']);
    }

    #[Route('/users/{id}/unlock', name: 'admin_user_unlock', methods: ['POST'])]
    public function unlockUser(User $user, EntityManagerInterface $em): JsonResponse
    {
        $user->setIsLocked(false);
        $user->resetFailedLoginAttempts();
        $em->flush();

        return $this->json(['message' => 'User account unlocked']);
    }

    #[Route('/vendors', name: 'admin_vendors_list', methods: ['GET'])]
    public function listVendors(EntityManagerInterface $em): JsonResponse
    {
        $vendors = $em->getRepository(VendorProfile::class)->findAll();
        $result = [];

        foreach ($vendors as $vendor) {
            $result[] = [
                'id' => $vendor->getId(),
                'company_name' => $vendor->getCompanyName(),
                'bio' => $vendor->getBio(),
                'website' => $vendor->getWebsite(),
                'portfolio_link' => $vendor->getPortfolioLink(),
                'user_id' => $vendor->getUser()->getId(),
            ];
        }

        return $this->json($result);
    }

    #[Route('/analytics', name: 'admin_analytics', methods: ['GET'])]
    public function analytics(EntityManagerInterface $em): JsonResponse
    {
        $userCount = $em->getRepository(User::class)->count([]);
        $vendorCount = $em->getRepository(VendorProfile::class)->count([]);
        $bookingCount = $em->getRepository(Booking::class)->count([]);

        return $this->json([
            'total_users' => $userCount,
            'total_vendors' => $vendorCount,
            'total_bookings' => $bookingCount,
        ]);
    }
}
