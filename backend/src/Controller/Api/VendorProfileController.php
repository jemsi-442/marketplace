<?php

namespace App\Controller\Api;

use App\Entity\Booking;
use App\Entity\ClientRequest;
use App\Entity\User;
use App\Entity\VendorProfile;
use App\Entity\VendorRequestInterest;
use App\Entity\VendorServiceCapability;
use App\Repository\ClientRequestRepository;
use App\Repository\VendorServiceCapabilityRepository;
use App\Service\VendorWalletService;
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
    /**
     * @return array<int, string>
     */
    private function getOpenRequestStatuses(): array
    {
        return [
            ClientRequest::STATUS_SUBMITTED,
            ClientRequest::STATUS_MATCHED,
            ClientRequest::STATUS_VENDOR_INTEREST_OPEN,
        ];
    }

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

    #[Route('/dashboard-summary', methods: ['GET'])]
    public function dashboardSummary(
        EntityManagerInterface $em,
        ClientRequestRepository $clientRequestRepository,
        VendorServiceCapabilityRepository $capabilityRepository,
        VendorWalletService $vendorWalletService
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $profile = $user->getVendorProfile();
        if (!$profile instanceof VendorProfile) {
            return $this->json(['error' => 'Vendor profile not created'], 422);
        }

        $activeCapabilities = $capabilityRepository->findBy([
            'vendor' => $profile,
            'isActive' => true,
        ]);

        $activeCapabilityCount = count($activeCapabilities);
        $approvedCapabilityCount = 0;
        $pendingCapabilityCount = 0;
        $returnedCapabilityCount = 0;

        $serviceTypeIds = [];
        foreach ($activeCapabilities as $capability) {
            if (!$capability instanceof VendorServiceCapability) {
                continue;
            }

            if ($capability->isApprovedByAdmin()) {
                ++$approvedCapabilityCount;
            } elseif ($capability->getReviewedAt() !== null) {
                ++$returnedCapabilityCount;
            } else {
                ++$pendingCapabilityCount;
            }

            if (!$capability->isApprovedByAdmin()) {
                continue;
            }

            $serviceTypeId = $capability->getServiceType()->getId();
            if ($serviceTypeId === null) {
                continue;
            }

            $serviceTypeIds[] = $serviceTypeId;
        }

        $openRequestCount = 0;
        if ($serviceTypeIds !== []) {
            $openRequestCount = (int) $clientRequestRepository
                ->createQueryBuilder('cr')
                ->join('cr.serviceType', 'st')
                ->where('st.id IN (:serviceTypeIds)')
                ->andWhere('cr.status IN (:statuses)')
                ->setParameter('serviceTypeIds', array_values(array_unique($serviceTypeIds)))
                ->setParameter('statuses', $this->getOpenRequestStatuses())
                ->select('COUNT(DISTINCT cr.id)')
                ->getQuery()
                ->getSingleScalarResult();
        }

        $activeBookingCount = (int) $em->getRepository(Booking::class)
            ->createQueryBuilder('b')
            ->leftJoin('b.assignedVendor', 'av')
            ->leftJoin('b.clientRequest', 'cr')
            ->leftJoin('cr.selectedVendor', 'sv')
            ->leftJoin('sv.user', 'svu')
            ->andWhere('(svu = :user OR av = :user)')
            ->andWhere('b.status <> :completedStatus')
            ->setParameter('user', $user)
            ->setParameter('completedStatus', Booking::STATUS_COMPLETED)
            ->select('COUNT(DISTINCT b.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $protectedBookingCount = (int) $em->getRepository(Booking::class)
            ->createQueryBuilder('b')
            ->leftJoin('b.assignedVendor', 'av')
            ->leftJoin('b.clientRequest', 'cr')
            ->leftJoin('cr.selectedVendor', 'sv')
            ->leftJoin('sv.user', 'svu')
            ->leftJoin('b.escrow', 'e')
            ->andWhere('(svu = :user OR av = :user)')
            ->andWhere('e.status = :activeEscrowStatus')
            ->setParameter('user', $user)
            ->setParameter('activeEscrowStatus', 'ACTIVE')
            ->select('COUNT(DISTINCT b.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $availableBalanceMinor = $vendorWalletService->getVendorBalance($user, 'TZS');

        return $this->json([
            'active_capabilities' => $activeCapabilityCount,
            'approved_capabilities' => $approvedCapabilityCount,
            'pending_capabilities' => $pendingCapabilityCount,
            'returned_capabilities' => $returnedCapabilityCount,
            'open_requests' => $openRequestCount,
            'active_bookings' => $activeBookingCount,
            'protected_bookings' => $protectedBookingCount,
            'available_balance_minor' => $availableBalanceMinor,
            'currency' => 'TZS',
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
