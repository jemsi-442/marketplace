<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\FraudRisk;
use App\Entity\User;
use App\Entity\VendorTrustProfile;
use App\Service\VendorTrustCalculator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
final class RiskInsightsController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly VendorTrustCalculator $vendorTrustCalculator,
    ) {
    }

    #[Route('/vendor/trust', name: 'vendor_trust_summary', methods: ['GET'])]
    #[IsGranted('ROLE_VENDOR')]
    public function vendorTrust(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $profile = $this->em->getRepository(VendorTrustProfile::class)->findOneBy(['vendor' => $user]);
        if (!$profile instanceof VendorTrustProfile) {
            $profile = $this->vendorTrustCalculator->recalculateForVendor($user, 'vendor_dashboard_view');
        }

        return $this->json($this->serializeVendorTrustProfile($profile));
    }

    #[Route('/admin/risk/overview', name: 'admin_risk_overview', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adminRiskOverview(): JsonResponse
    {
        $userRepo = $this->em->getRepository(User::class);
        $trustRepo = $this->em->getRepository(VendorTrustProfile::class);
        $fraudRiskRepo = $this->em->getRepository(FraudRisk::class);

        /** @var array<int, User> $users */
        $users = $userRepo->findAll();
        $highOrCriticalUsers = 0;
        $criticalUsers = 0;
        $mediumOrAboveUsers = 0;

        foreach ($users as $user) {
            $riskLevel = $user->getRiskLevel();
            if (in_array($riskLevel, ['MEDIUM', 'HIGH', 'CRITICAL'], true)) {
                ++$mediumOrAboveUsers;
            }

            if (in_array($riskLevel, ['HIGH', 'CRITICAL'], true)) {
                ++$highOrCriticalUsers;
            }

            if ($riskLevel === 'CRITICAL') {
                ++$criticalUsers;
            }
        }

        /** @var array<int, FraudRisk> $latestFraudRisks */
        $latestFraudRisks = $fraudRiskRepo->createQueryBuilder('fr')
            ->join('fr.user', 'u')
            ->addSelect('u')
            ->orderBy('fr.createdAt', 'DESC')
            ->setMaxResults(8)
            ->getQuery()
            ->getResult();

        /** @var array<int, VendorTrustProfile> $watchlist */
        $watchlist = $trustRepo->createQueryBuilder('vt')
            ->join('vt.vendor', 'v')
            ->addSelect('v')
            ->orderBy('vt.calculatedTrustScore', 'ASC')
            ->addOrderBy('vt.updatedAt', 'DESC')
            ->setMaxResults(8)
            ->getQuery()
            ->getResult();

        return $this->json([
            'summary' => [
                'users_monitored' => count($users),
                'medium_or_above_users' => $mediumOrAboveUsers,
                'high_or_critical_users' => $highOrCriticalUsers,
                'critical_users' => $criticalUsers,
                'vendors_monitored' => $trustRepo->count([]),
            ],
            'latest_fraud_risks' => array_map(
                fn (FraudRisk $risk): array => [
                    'id' => $risk->getId(),
                    'user_id' => $risk->getUser()->getId(),
                    'user_label' => $this->maskUserLabel($risk->getUser()),
                    'score' => $risk->getScore(),
                    'risk_level' => $risk->getRiskLevel(),
                    'reason' => $risk->getReason(),
                    'created_at' => $risk->getCreatedAt()->format(DATE_ATOM),
                ],
                $latestFraudRisks
            ),
            'vendor_trust_watchlist' => array_map(
                fn (VendorTrustProfile $profile): array => $this->serializeVendorTrustProfile($profile),
                $watchlist
            ),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeVendorTrustProfile(VendorTrustProfile $profile): array
    {
        return [
            'vendor_id' => $profile->getVendor()->getId(),
            'vendor_label' => $this->maskUserLabel($profile->getVendor()),
            'completed_jobs_count' => $profile->getCompletedJobsCount(),
            'dispute_count' => $profile->getDisputeCount(),
            'average_rating' => $profile->getAverageRating(),
            'escrow_release_ratio' => $profile->getEscrowReleaseRatio(),
            'on_time_delivery_ratio' => $profile->getOnTimeDeliveryRatio(),
            'refund_ratio' => $profile->getRefundRatio(),
            'total_volume_minor' => $profile->getTotalVolumeMinor(),
            'calculated_trust_score' => $profile->getCalculatedTrustScore(),
            'risk_level' => $profile->getRiskLevel(),
            'updated_at' => $profile->getUpdatedAt()->format(DATE_ATOM),
            'metadata' => $profile->getLastCalculationMetadata(),
        ];
    }

    private function maskUserLabel(User $user): string
    {
        $email = strtolower(trim($user->getEmail()));
        $localPart = strtok($email, '@');
        $localPart = is_string($localPart) ? $localPart : 'user';
        $prefix = mb_substr($localPart, 0, min(3, max(1, mb_strlen($localPart))));

        return sprintf('%s*** (#%d)', $prefix, $user->getId() ?? 0);
    }
}
