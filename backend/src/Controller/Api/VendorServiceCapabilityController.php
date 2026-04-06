<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\ServiceType;
use App\Entity\User;
use App\Entity\VendorServiceCapability;
use App\Repository\ServiceTypeRepository;
use App\Repository\VendorServiceCapabilityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/vendor/service-capabilities')]
#[IsGranted('ROLE_VENDOR')]
final class VendorServiceCapabilityController extends AbstractController
{
    private function determineReviewState(VendorServiceCapability $capability): string
    {
        if ($capability->isApprovedByAdmin()) {
            return 'approved';
        }

        if ($capability->getReviewedAt() !== null) {
            return 'returned';
        }

        return 'pending';
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeCapability(VendorServiceCapability $capability): array
    {
        return [
            'id' => $capability->getId(),
            'service_type' => [
                'id' => $capability->getServiceType()->getId(),
                'name' => $capability->getServiceType()->getName(),
                'slug' => $capability->getServiceType()->getSlug(),
                'category' => $capability->getServiceType()->getCategory(),
                'group_slug' => $capability->getServiceType()->getGroupSlug(),
                'group_title' => $capability->getServiceType()->getGroupTitle(),
            ],
            'is_active' => $capability->isActive(),
            'experience_level' => $capability->getExperienceLevel(),
            'starting_price_minor' => $capability->getStartingPriceMinor(),
            'portfolio_summary' => $capability->getPortfolioSummary(),
            'capacity_status' => $capability->getCapacityStatus(),
            'turnaround_note' => $capability->getTurnaroundNote(),
            'approved_by_admin' => $capability->isApprovedByAdmin(),
            'review_state' => $this->determineReviewState($capability),
            'admin_review_note' => $capability->getAdminReviewNote(),
            'reviewed_at' => $capability->getReviewedAt()?->format('Y-m-d H:i:s'),
            'reviewed_by_admin' => $capability->getReviewedByAdmin() instanceof User ? [
                'id' => $capability->getReviewedByAdmin()?->getId(),
                'email' => $capability->getReviewedByAdmin()?->getEmail(),
            ] : null,
            'created_at' => $capability->getCreatedAt()->format('Y-m-d H:i:s'),
            'updated_at' => $capability->getUpdatedAt()->format('Y-m-d H:i:s'),
        ];
    }

    #[Route('', name: 'vendor_service_capability_list', methods: ['GET'])]
    public function list(VendorServiceCapabilityRepository $repository): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $vendorProfile = $user->getVendorProfile();
        if ($vendorProfile === null) {
            return $this->json(['error' => 'Vendor profile required'], 422);
        }

        $capabilities = $repository->findBy(['vendor' => $vendorProfile], ['updatedAt' => 'DESC']);

        return $this->json([
            'capabilities' => array_map(fn (VendorServiceCapability $capability): array => $this->serializeCapability($capability), $capabilities),
        ]);
    }

    #[Route('', name: 'vendor_service_capability_upsert', methods: ['PUT'])]
    public function upsert(
        Request $request,
        EntityManagerInterface $em,
        ServiceTypeRepository $serviceTypeRepository,
        VendorServiceCapabilityRepository $capabilityRepository
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $vendorProfile = $user->getVendorProfile();
        if ($vendorProfile === null) {
            return $this->json(['error' => 'Vendor profile required'], 422);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload) || !isset($payload['capabilities']) || !is_array($payload['capabilities'])) {
            return $this->json(['error' => 'capabilities payload is required'], 400);
        }

        $allowedCapacityStatuses = [
            VendorServiceCapability::CAPACITY_AVAILABLE,
            VendorServiceCapability::CAPACITY_LIMITED,
            VendorServiceCapability::CAPACITY_UNAVAILABLE,
        ];

        $existingCapabilities = $capabilityRepository->findBy(['vendor' => $vendorProfile]);
        $existingCapabilityMap = [];
        foreach ($existingCapabilities as $existingCapability) {
            if (!$existingCapability instanceof VendorServiceCapability) {
                continue;
            }

            $existingServiceTypeId = $existingCapability->getServiceType()->getId();
            if ($existingServiceTypeId === null) {
                continue;
            }

            $existingCapabilityMap[$existingServiceTypeId] = $existingCapability;
        }

        $requestedServiceTypeIds = [];
        foreach ($payload['capabilities'] as $index => $row) {
            if (!is_array($row)) {
                return $this->json(['error' => sprintf('Capability row %d is invalid', $index)], 400);
            }

            $serviceTypeId = isset($row['service_type_id']) ? (int) $row['service_type_id'] : 0;
            if ($serviceTypeId <= 0) {
                return $this->json(['error' => sprintf('service_type_id is required for row %d', $index)], 400);
            }

            $requestedServiceTypeIds[] = $serviceTypeId;
        }

        $serviceTypes = $serviceTypeRepository->findBy([
            'id' => array_values(array_unique($requestedServiceTypeIds)),
        ]);
        $serviceTypeMap = [];
        foreach ($serviceTypes as $serviceType) {
            if (!$serviceType instanceof ServiceType || !$serviceType->isActive()) {
                continue;
            }

            $resolvedServiceTypeId = $serviceType->getId();
            if ($resolvedServiceTypeId === null) {
                continue;
            }

            $serviceTypeMap[$resolvedServiceTypeId] = $serviceType;
        }

        $seenServiceTypeIds = [];

        foreach ($payload['capabilities'] as $index => $row) {
            $serviceTypeId = isset($row['service_type_id']) ? (int) $row['service_type_id'] : 0;
            if (in_array($serviceTypeId, $seenServiceTypeIds, true)) {
                return $this->json(['error' => sprintf('service_type_id %d was repeated', $serviceTypeId)], 400);
            }
            $seenServiceTypeIds[] = $serviceTypeId;

            $serviceType = $serviceTypeMap[$serviceTypeId] ?? null;
            if (!$serviceType instanceof ServiceType) {
                return $this->json(['error' => sprintf('Service type %d was not found', $serviceTypeId)], 404);
            }

            $isActive = isset($row['is_active']) ? (bool) $row['is_active'] : true;
            $experienceLevel = isset($row['experience_level']) && is_string($row['experience_level']) && trim($row['experience_level']) !== ''
                ? trim($row['experience_level'])
                : 'standard';
            $startingPriceMinor = isset($row['starting_price_minor']) && $row['starting_price_minor'] !== null && $row['starting_price_minor'] !== ''
                ? (int) $row['starting_price_minor']
                : null;
            $portfolioSummary = isset($row['portfolio_summary']) && is_string($row['portfolio_summary']) && trim($row['portfolio_summary']) !== ''
                ? trim($row['portfolio_summary'])
                : null;
            $capacityStatus = isset($row['capacity_status']) && is_string($row['capacity_status']) && trim($row['capacity_status']) !== ''
                ? trim($row['capacity_status'])
                : VendorServiceCapability::CAPACITY_AVAILABLE;
            $turnaroundNote = isset($row['turnaround_note']) && is_string($row['turnaround_note']) && trim($row['turnaround_note']) !== ''
                ? trim($row['turnaround_note'])
                : null;

            if ($startingPriceMinor !== null && $startingPriceMinor < 0) {
                return $this->json(['error' => sprintf('starting_price_minor cannot be negative for row %d', $index)], 400);
            }
            if (!in_array($capacityStatus, $allowedCapacityStatuses, true)) {
                return $this->json(['error' => sprintf('capacity_status is invalid for row %d', $index)], 400);
            }
            if (mb_strlen($experienceLevel) > 40) {
                return $this->json(['error' => sprintf('experience_level is too long for row %d', $index)], 400);
            }
            if ($portfolioSummary !== null && mb_strlen($portfolioSummary) > 5000) {
                return $this->json(['error' => sprintf('portfolio_summary is too long for row %d', $index)], 400);
            }
            if ($turnaroundNote !== null && mb_strlen($turnaroundNote) > 255) {
                return $this->json(['error' => sprintf('turnaround_note is too long for row %d', $index)], 400);
            }

            $capability = $existingCapabilityMap[$serviceTypeId] ?? null;

            $normalizedExperienceLevel = trim($experienceLevel);
            $normalizedPortfolioSummary = $portfolioSummary !== null ? trim($portfolioSummary) : null;
            $normalizedTurnaroundNote = $turnaroundNote !== null ? trim($turnaroundNote) : null;
            if (!$capability instanceof VendorServiceCapability) {
                $capability = new VendorServiceCapability();
                $capability->setVendor($vendorProfile);
                $capability->setServiceType($serviceType);
                $em->persist($capability);
            } else {
                $materiallyChanged =
                    $capability->isActive() !== $isActive
                    || $capability->getExperienceLevel() !== $normalizedExperienceLevel
                    || $capability->getStartingPriceMinor() !== $startingPriceMinor
                    || $capability->getPortfolioSummary() !== $normalizedPortfolioSummary
                    || $capability->getCapacityStatus() !== $capacityStatus
                    || $capability->getTurnaroundNote() !== $normalizedTurnaroundNote;

                if ($materiallyChanged && ($capability->isApprovedByAdmin() || $capability->getReviewedAt() !== null)) {
                    $capability->clearAdminReviewState();
                }
            }

            $capability
                ->setIsActive($isActive)
                ->setExperienceLevel($normalizedExperienceLevel)
                ->setStartingPriceMinor($startingPriceMinor)
                ->setPortfolioSummary($normalizedPortfolioSummary)
                ->setCapacityStatus($capacityStatus)
                ->setTurnaroundNote($normalizedTurnaroundNote);

        }

        foreach ($existingCapabilities as $existingCapability) {
            if (
                !$existingCapability instanceof VendorServiceCapability
                || in_array($existingCapability->getServiceType()->getId(), $seenServiceTypeIds, true)
            ) {
                continue;
            }

            if ($existingCapability->isActive() || $existingCapability->isApprovedByAdmin() || $existingCapability->getReviewedAt() !== null) {
                $existingCapability
                    ->setIsActive(false)
                    ->clearAdminReviewState();
            }
        }

        $em->flush();

        $allCapabilities = $capabilityRepository->findBy(['vendor' => $vendorProfile], ['updatedAt' => 'DESC']);

        return $this->json([
            'message' => 'Vendor capabilities updated',
            'capabilities' => array_map(fn (VendorServiceCapability $capability): array => $this->serializeCapability($capability), $allCapabilities),
        ]);
    }
}
