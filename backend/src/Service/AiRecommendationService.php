<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\AiInteraction;
use App\Entity\User;
use App\Entity\VendorServiceCapability;
use App\Entity\VendorTrustProfile;
use App\Repository\AiInteractionRepository;
use Doctrine\ORM\EntityManagerInterface;

class AiRecommendationService
{
    public function __construct(
        private readonly AiInteractionRepository $aiRepo,
        private readonly EntityManagerInterface $em,
        private readonly MarketplaceMatchingService $matchingService
    ) {
    }

    /**
     * @param array<string, mixed> $criteria
     * @return array<int, array<string, mixed>>
     */
    public function recommendServices(User $user, array $criteria = [], int $limit = 5): array
    {
        $limit = max(1, min(20, $limit));
        $queryValue = $criteria['query'] ?? '';
        $budgetValue = $criteria['budget_minor'] ?? 0;
        $timelineValue = $criteria['timeline_days'] ?? null;
        $riskToleranceValue = $criteria['risk_tolerance'] ?? 'MEDIUM';

        $searchQuery = is_string($queryValue) ? trim($queryValue) : '';
        $budgetMinor = is_numeric($budgetValue) ? max(0, (int) $budgetValue) : 0;
        $timelineDays = is_numeric($timelineValue) ? (int) $timelineValue : null;
        $riskTolerance = is_string($riskToleranceValue) ? strtoupper($riskToleranceValue) : 'MEDIUM';

        if ($searchQuery !== '' || $budgetMinor > 0 || $timelineDays !== null) {
            return $this->matchingService->rankVendors(
                searchQuery: $searchQuery,
                budgetMinor: $budgetMinor,
                timelineDays: $timelineDays,
                riskTolerance: $riskTolerance,
                limit: $limit
            );
        }

        $preferredCategories = $this->loadPreferredCategories($user);
        $capabilities = $this->loadCandidateCapabilities($preferredCategories, $limit);
        if ($capabilities === []) {
            return [];
        }

        $reviewStats = $this->loadReviewStats($capabilities);
        $trustScores = $this->loadVendorTrustScores($capabilities);
        $maxPriceCents = max(1, ...array_map(
            static fn (VendorServiceCapability $capability): int => $capability->getStartingPriceMinor() ?? 0,
            $capabilities
        ));

        $ranked = [];
        foreach ($capabilities as $capability) {
            $capabilityId = $capability->getId();
            $serviceType = $capability->getServiceType();
            $serviceTypeId = $serviceType->getId();
            if ($capabilityId === null || $serviceTypeId === null) {
                continue;
            }

            $vendorUser = $capability->getVendor()->getUser();
            $startingPriceMinor = $capability->getStartingPriceMinor() ?? 0;

            $serviceReviewStats = $reviewStats[$capabilityId] ?? ['avg_rating' => 0.0, 'review_count' => 0];
            $trustScore = $trustScores[$vendorUser->getId()] ?? $vendorUser->getTrustScore();
            $categoryAffinity = $this->categoryAffinityScore($capability, $preferredCategories);
            $reviewScore = ((float) $serviceReviewStats['avg_rating'] / 5.0) * 100.0;
            $priceScore = $startingPriceMinor > 0
                ? max(20.0, 100.0 - (($startingPriceMinor / $maxPriceCents) * 100.0))
                : 55.0;

            $composite = ($trustScore * 0.45)
                + ($reviewScore * 0.25)
                + ($categoryAffinity * 0.20)
                + ($priceScore * 0.10);

            $ranked[] = [
                'service_id' => null,
                'service_type_id' => $serviceTypeId,
                'capability_id' => $capabilityId,
                'title' => $serviceType->getName(),
                'vendor_id' => $vendorUser->getId(),
                'category' => $serviceType->getCategory(),
                'price_cents' => $startingPriceMinor,
                'signals' => [
                    'trust_score' => round($trustScore, 2),
                    'average_rating' => round((float) $serviceReviewStats['avg_rating'], 2),
                    'review_count' => (int) $serviceReviewStats['review_count'],
                    'category_affinity' => round($categoryAffinity, 2),
                    'price_score' => round($priceScore, 2),
                    'experience_level' => $capability->getExperienceLevel(),
                    'capacity_status' => $capability->getCapacityStatus(),
                ],
                'composite_score' => round($composite, 2),
                'source' => 'personalized_recommendation',
            ];
        }

        usort($ranked, static fn (array $a, array $b): int => $b['composite_score'] <=> $a['composite_score']);

        return array_slice($ranked, 0, $limit);
    }

    /**
     * @param array<string, mixed> $contextData
     */
    public function handleQuestion(User $user, string $question, ?string $contextTag = null, array $contextData = []): AiInteraction
    {
        $questionKey = strtolower(trim($question));

        $allowedKeywords = [
            'service', 'vendor', 'booking', 'payment', 'marketplace', 'review',
            'notification', 'escrow', 'wallet', 'withdrawal', 'trust', 'fraud',
            'delivery', 'dispute', 'listing', 'catalog', 'profile', 'admin',
            'payout', 'studio', 'client', 'provider', 'message',
            'capability', 'lane',
        ];

        $isRelevant = false;
        foreach ($allowedKeywords as $keyword) {
            if (str_contains($questionKey, $keyword)) {
                $isRelevant = true;
                break;
            }
        }

        if (!$isRelevant) {
            $answer = 'Samahani, uliza kuhusu marketplace yetu: services, vendors, bookings, escrow, wallets, withdrawals, reviews, au trust/risk.';
        } else {
            $answer = sprintf(
                "Swali lako limepokelewa: '%s'. Kwa sasa AI layer ni rule-based, hivyo jibu la kina linapaswa kutegemea data ya marketplace yetu.%s%s",
                $question,
                $this->contextualSuffix($contextTag, $contextData),
                $this->contextualActionHint($contextTag, $contextData)
            );
        }

        $interaction = new AiInteraction();
        $interaction->setUser($user);
        $interaction->setQuestion($question);
        $interaction->setAnswer($answer);
        $interaction->setContextTag($contextTag ? strtolower(trim($contextTag)) : null);
        $interaction->setContextData($contextData !== [] ? $contextData : null);
        $this->em->persist($interaction);
        $this->em->flush();

        return $interaction;
    }

    /**
     * @param array<string, mixed>|null $contextData
     * @return array<string, mixed>|null
     */
    public function buildStructuredRecommendation(?string $contextTag, ?array $contextData = null): ?array
    {
        $tag = $contextTag ? strtolower(trim($contextTag)) : '';
        $data = $contextData ?? [];

        return match ($tag) {
            'client_dashboard' => $this->buildClientDashboardRecommendation($data),
            'vendor_dashboard' => $this->buildVendorDashboardRecommendation($data),
            'admin_dashboard' => $this->buildAdminDashboardRecommendation($data),
            'booking_workspace' => $this->buildBookingWorkspaceRecommendation($data),
            'service_workspace', 'capability_workspace' => $this->buildServiceWorkspaceRecommendation($data),
            default => null,
        };
    }

    /**
     * @param array<string, mixed>|null $contextData
     */
    public function determineFocusArea(?string $contextTag, ?array $contextData = null): ?string
    {
        $tag = $contextTag ? strtolower(trim($contextTag)) : '';
        $data = $contextData ?? [];

        return match ($tag) {
            'client_dashboard' => $this->clientDashboardFocus($data),
            'vendor_dashboard' => $this->vendorDashboardFocus($data),
            'admin_dashboard' => $this->adminDashboardFocus($data),
            'booking_workspace' => $this->bookingWorkspaceFocus($data),
            'service_workspace', 'capability_workspace' => $this->serviceWorkspaceFocus($data),
            default => null,
        };
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function contextualSuffix(?string $contextTag, array $contextData): string
    {
        $tag = $contextTag ? strtolower(trim($contextTag)) : '';

        return match ($tag) {
            'client_dashboard' => ' Uko kwenye client workspace, hivyo linganisha fit ya lane, escrow step inayofuata, na delivery clarity kabla ya booking au release.',
            'vendor_dashboard' => ' Uko kwenye vendor studio, hivyo zingatia clarity ya capability, live delivery pressure, na payout readiness kabla ya kuchukua hatua.',
            'admin_dashboard' => ' Uko kwenye admin operations desk, hivyo soma evidence, risk, na dispute context kabla ya intervention yoyote.',
            'booking_workspace' => sprintf(
                ' Hii imeulizwa kutoka booking workspace%s, hivyo booking status, escrow state, na message trail ndiyo context kuu ya uamuzi.',
                isset($contextData['booking_id']) ? ' ya booking #' . (string) $contextData['booking_id'] : ''
            ),
            'service_workspace', 'capability_workspace' => sprintf(
                ' Hii imeulizwa kutoka capability workspace%s, hivyo scope, price, proof, na latest booking activity ndiyo context kuu ya lane hii.',
                isset($contextData['service_type_id']) ? ' ya service type #' . (string) $contextData['service_type_id'] : ''
            ),
            default => '',
        };
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function contextualActionHint(?string $contextTag, array $contextData): string
    {
        $tag = $contextTag ? strtolower(trim($contextTag)) : '';

        return match ($tag) {
            'client_dashboard' => $this->clientDashboardHint($contextData),
            'vendor_dashboard' => $this->vendorDashboardHint($contextData),
            'admin_dashboard' => $this->adminDashboardHint($contextData),
            'booking_workspace' => $this->bookingWorkspaceHint($contextData),
            'service_workspace', 'capability_workspace' => $this->serviceWorkspaceHint($contextData),
            default => '',
        };
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function clientDashboardHint(array $contextData): string
    {
        $disputes = $this->readInt($contextData, 'disputed_booking_count');
        $pendingCollection = $this->readInt($contextData, 'pending_collection_count');
        $activeDelivery = $this->readInt($contextData, 'active_delivery_count');
        $activeCategory = $this->readString($contextData, 'active_category');

        if ($disputes > 0) {
            return sprintf(
                ' Kwa sasa una dispute %d, hivyo priority ni kufungua bookings rail, kukusanya ushahidi wa delivery, na kusubiri admin review kabla ya hatua ya fedha.',
                $disputes
            );
        }

        if ($pendingCollection > 0) {
            return sprintf(
                ' Una booking %d zinazohitaji collection, hivyo hatua salama inayofuata ni kuanzisha payment collection kabla ya kutegemea delivery ianze.',
                $pendingCollection
            );
        }

        if ($activeDelivery > 0) {
            return sprintf(
                ' Una delivery %d zilizo active, hivyo kipaumbele ni kufuatilia progress, kutumia message trail, na kurelease escrow tu baada ya outcome kuwa wazi.',
                $activeDelivery
            );
        }

        if ($activeCategory !== null && $activeCategory !== '' && strtoupper($activeCategory) !== 'ALL') {
            return sprintf(
                ' Kwa sasa ume-focus lane ya %s, hivyo linganisha scope, price, na trust signals kabla ya kufungua booking mpya.',
                $activeCategory
            );
        }

        return ' Kama hakuna work item active, anza kwenye request lanes na chagua lane iliyoeleweka vizuri kabla ya kufungua request au booking.';
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function clientDashboardFocus(array $contextData): string
    {
        if ($this->readInt($contextData, 'disputed_booking_count') > 0) {
            return 'risk';
        }

        if ($this->readInt($contextData, 'pending_collection_count') > 0) {
            return 'finance';
        }

        if ($this->readInt($contextData, 'active_delivery_count') > 0) {
            return 'delivery';
        }

        return 'lane';
    }

    /**
     * @param array<string, mixed> $contextData
     * @return array<string, mixed>
     */
    private function buildClientDashboardRecommendation(array $contextData): array
    {
        $disputes = $this->readInt($contextData, 'disputed_booking_count');
        $pendingCollection = $this->readInt($contextData, 'pending_collection_count');
        $activeDelivery = $this->readInt($contextData, 'active_delivery_count');
        $activeCategory = $this->readString($contextData, 'active_category');

        if ($disputes > 0) {
            return [
                'title' => 'Review disputed bookings first',
                'detail' => 'Open the bookings rail and keep every next move tied to evidence, delivery facts, and admin review readiness.',
                'action_label' => 'Open bookings rail',
                'action_href' => '/dashboard/client#client-bookings-rail',
                'tone' => 'warning',
                'why' => 'One or more client bookings are already disputed, so evidence review matters more than opening new work.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($pendingCollection > 0) {
            return [
                'title' => 'Start protected collection',
                'detail' => 'These bookings already have escrow context, so the next safe move is collection before delivery expectations grow.',
                'action_label' => 'Open payment actions',
                'action_href' => '/dashboard/client#client-bookings-rail',
                'tone' => 'info',
                'why' => 'Escrow already exists, so collection is the cleanest next step before delivery deepens.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($activeDelivery > 0) {
            return [
                'title' => 'Track live delivery',
                'detail' => 'Stay inside active bookings until outcome clarity is strong enough for release or escalation.',
                'action_label' => 'Review live bookings',
                'action_href' => '/dashboard/client#client-bookings-rail',
                'tone' => 'success',
                'why' => 'Active delivery exists right now, so the next safe move is to monitor progress instead of creating new work.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($activeCategory !== null && $activeCategory !== '' && strtoupper($activeCategory) !== 'ALL') {
            return [
                'title' => 'Compare options inside the active lane',
                'detail' => sprintf('Stay in %s and compare fit, scope, and trust before opening a booking.', $activeCategory),
                'action_label' => 'Open active lane',
                'action_href' => '/dashboard/request-services',
                'tone' => 'info',
                'why' => 'You are already focused on one category, which makes comparison inside that lane more reliable.',
                'confidence_label' => 'Medium confidence',
            ];
        }

        return [
            'title' => 'Start with the request lanes',
            'detail' => 'When no live work needs attention, the cleanest next step is to compare lanes and open one clear booking.',
            'action_label' => 'Browse lanes',
            'action_href' => '/dashboard/request-services',
            'tone' => 'info',
            'why' => 'There is no live delivery pressure in the current context.',
            'confidence_label' => 'Medium confidence',
        ];
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function vendorDashboardHint(array $contextData): string
    {
        $liveServices = $this->readInt($contextData, 'live_service_count');
        $inactiveServices = $this->readInt($contextData, 'inactive_service_count');
        $activeDelivery = $this->readInt($contextData, 'active_delivery_count');
        $availableBalance = $this->readInt($contextData, 'available_balance');

        if ($activeDelivery > 0) {
            return sprintf(
                ' Una delivery %d zilizo live, hivyo update ya message trail na delivery evidence ndiyo hatua muhimu kabla ya payout au capability edits mpya.',
                $activeDelivery
            );
        }

        if ($liveServices === 0) {
            return ' Bado huna capability iliyo tayari, hivyo hatua ya kwanza ni kukamilisha lane moja iliyo wazi, yenye category, starting price, na scope safi.';
        }

        if ($inactiveServices > 0) {
            return sprintf(
                ' Una capability %d inactive, hivyo review clarity ya lane, starting price, na portfolio summary kabla ya kurudi live.',
                $inactiveServices
            );
        }

        if ($availableBalance > 0) {
            return sprintf(
                ' Una balance inayoonekana ya %d, hivyo payout inaweza kufuatwa baada ya kuhakikisha delivery zinazohusiana zimekamilika vizuri.',
                $availableBalance
            );
        }

        return sprintf(
            ' Studio yako ina capability %d active, hivyo hatua salama ni kuendelea kuboresha capability clarity na kuangalia kama lane hizo zinafanya matching vizuri.',
            $liveServices
        );
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function vendorDashboardFocus(array $contextData): string
    {
        if ($this->readInt($contextData, 'active_delivery_count') > 0) {
            return 'delivery';
        }

        if ($this->readInt($contextData, 'inactive_service_count') > 0) {
            return 'capability';
        }

        if ($this->readInt($contextData, 'available_balance') > 0) {
            return 'finance';
        }

        return 'capability';
    }

    /**
     * @param array<string, mixed> $contextData
     * @return array<string, mixed>
     */
    private function buildVendorDashboardRecommendation(array $contextData): array
    {
        $liveServices = $this->readInt($contextData, 'live_service_count');
        $inactiveServices = $this->readInt($contextData, 'inactive_service_count');
        $activeDelivery = $this->readInt($contextData, 'active_delivery_count');
        $availableBalance = $this->readInt($contextData, 'available_balance');

        if ($activeDelivery > 0) {
            return [
                'title' => 'Stay with active delivery first',
                'detail' => 'When live client work exists, delivery evidence and message clarity matter more than capability edits or payout moves.',
                'action_label' => 'Open delivery work',
                'action_href' => '/dashboard/vendor-requests',
                'tone' => 'success',
                'why' => 'Live delivery usually outranks capability edits and payouts because it affects trust immediately.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($liveServices === 0) {
            return [
                'title' => 'Activate the first clear capability',
                'detail' => 'Complete one capability with clean lane, starting price, and scope before chasing other studio tasks.',
                'action_label' => 'Open capabilities',
                'action_href' => '/dashboard/vendor-capabilities',
                'tone' => 'info',
                'why' => 'Without an active capability, the studio cannot convert attention into tracked work.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($inactiveServices > 0) {
            return [
                'title' => 'Rework inactive capabilities',
                'detail' => 'Fix clarity gaps before reactivating capabilities so buyers understand what the lane actually covers.',
                'action_label' => 'Review capabilities',
                'action_href' => '/dashboard/vendor-capabilities',
                'tone' => 'warning',
                'why' => 'Inactive capabilities usually point to clarity or readiness gaps that should be fixed first.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($availableBalance > 0) {
            return [
                'title' => 'Check payout readiness',
                'detail' => 'If delivery is already clean, review payout details and withdraw only after the work trail is settled.',
                'action_label' => 'Open payout desk',
                'action_href' => '/dashboard/vendor-withdrawals',
                'tone' => 'info',
                'why' => 'Visible balance suggests payout may be timely if delivery is already clean.',
                'confidence_label' => 'Medium confidence',
            ];
        }

        return [
            'title' => 'Polish active capabilities',
            'detail' => 'Use this calmer window to improve capability quality and strengthen how the studio presents its lanes.',
            'action_label' => 'Open capabilities',
            'action_href' => '/dashboard/vendor-capabilities',
            'tone' => 'success',
            'why' => 'Current studio pressure is low enough to focus on capability quality.',
            'confidence_label' => 'Medium confidence',
        ];
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function adminDashboardHint(array $contextData): string
    {
        $openDisputes = $this->readInt($contextData, 'open_disputes');
        $criticalUsers = $this->readInt($contextData, 'critical_users');
        $trustWatchlist = $this->readInt($contextData, 'trust_watchlist_count');

        if ($openDisputes > 0) {
            return sprintf(
                ' Kuna dispute %d wazi, hivyo priority ya kwanza ni kusoma evidence, AI review, na message trail kabla ya release au refund.',
                $openDisputes
            );
        }

        if ($criticalUsers > 0) {
            return sprintf(
                ' Kuna user %d wa kiwango critical, hivyo review lock context, fraud reason, na operational impact kabla ya kuchukua action.',
                $criticalUsers
            );
        }

        if ($trustWatchlist > 0) {
            return sprintf(
                ' Trust watchlist ina entries %d, hivyo angalia providers wanaopanda risk kabla hali haijageuka dispute au payout issue.',
                $trustWatchlist
            );
        }

        return ' Desk iko calm kwa sasa, hivyo unaweza kutumia nafasi hii ku-review alerts, trend health, na control posture kabla ya escalation inayofuata.';
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function adminDashboardFocus(array $contextData): string
    {
        if ($this->readInt($contextData, 'open_disputes') > 0) {
            return 'risk';
        }

        if ($this->readInt($contextData, 'critical_users') > 0) {
            return 'operations';
        }

        if ($this->readInt($contextData, 'trust_watchlist_count') > 0) {
            return 'risk';
        }

        return 'operations';
    }

    /**
     * @param array<string, mixed> $contextData
     * @return array<string, mixed>
     */
    private function buildAdminDashboardRecommendation(array $contextData): array
    {
        $openDisputes = $this->readInt($contextData, 'open_disputes');
        $criticalUsers = $this->readInt($contextData, 'critical_users');
        $trustWatchlist = $this->readInt($contextData, 'trust_watchlist_count');

        if ($openDisputes > 0) {
            return [
                'title' => 'Triage disputed escrows first',
                'detail' => 'Read AI review, payment context, and message trail before choosing release or refund.',
                'action_label' => 'Open dispute desk',
                'action_href' => '/dashboard/admin#admin-disputes',
                'tone' => 'warning',
                'why' => 'Financial disputes carry immediate operational risk and usually need attention before quieter watchlists.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($criticalUsers > 0) {
            return [
                'title' => 'Inspect critical accounts',
                'detail' => 'Review why each account escalated before locking or unlocking anything.',
                'action_label' => 'Review user controls',
                'action_href' => '/dashboard/admin#admin-user-controls',
                'tone' => 'danger',
                'why' => 'Critical-account pressure can change platform risk quickly if left unreviewed.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($trustWatchlist > 0) {
            return [
                'title' => 'Check provider trust drift',
                'detail' => 'Use the watchlist now so provider risk does not mature into payout or dispute pressure.',
                'action_label' => 'Inspect trust watchlist',
                'action_href' => '/dashboard/admin#admin-trust-watchlist',
                'tone' => 'info',
                'why' => 'Provider trust drift is an early signal worth handling before it becomes a dispute or payout issue.',
                'confidence_label' => 'Medium confidence',
            ];
        }

        return [
            'title' => 'Recheck platform posture',
            'detail' => 'When the desk is calm, use the time to review health, alerts, and baseline control readiness.',
            'action_label' => 'Open overview',
            'action_href' => '/dashboard',
            'tone' => 'success',
            'why' => 'When no acute pressure is visible, a broad operational posture check is the safest next move.',
            'confidence_label' => 'Medium confidence',
        ];
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function bookingWorkspaceHint(array $contextData): string
    {
        $bookingId = $this->readInt($contextData, 'booking_id');
        $bookingStatus = strtoupper($this->readString($contextData, 'booking_status') ?? '');
        $escrowStatus = strtoupper($this->readString($contextData, 'escrow_status') ?? '');
        $serviceTitle = $this->readString($contextData, 'service_title');
        $bookingReference = $bookingId > 0 ? sprintf(' booking #%d', $bookingId) : ' hii booking';
        $serviceReference = $serviceTitle !== null && $serviceTitle !== '' ? sprintf(' ya "%s"', $serviceTitle) : '';

        if ($escrowStatus === '') {
            return sprintf(
                ' Kwa%s%s bado hakuna escrow, hivyo hatua salama inayofuata ni ku-create escrow kabla ya kuanzisha collection au delivery expectation.',
                $bookingReference,
                $serviceReference
            );
        }

        if ($escrowStatus === 'CREATED') {
            return sprintf(
                ' Kwa%s%s escrow ipo lakini collection bado haijaanza, hivyo payment collection ndiyo next move safi.',
                $bookingReference,
                $serviceReference
            );
        }

        if ($escrowStatus === 'ACTIVE') {
            return sprintf(
                ' Kwa%s%s escrow iko active, hivyo focus iwe delivery trail, message clarity, na release/dispute decision tu baada ya evidence kuwa wazi.',
                $bookingReference,
                $serviceReference
            );
        }

        if ($escrowStatus === 'DISPUTED') {
            return sprintf(
                ' Kwa%s%s dispute tayari iko wazi, hivyo ushauri salama ni kushikilia decision kwenye evidence, delivery compliance, na thread ya mawasiliano.',
                $bookingReference,
                $serviceReference
            );
        }

        if ($escrowStatus === 'RELEASED' || $bookingStatus === 'COMPLETED') {
            return sprintf(
                ' Kwa%s%s fedha tayari zimehamishwa au booking imefungwa, hivyo hatua inayobaki ni review ya outcome na clean close-out.',
                $bookingReference,
                $serviceReference
            );
        }

        return sprintf(
            ' Kwa%s%s soma booking status, escrow state, na conversation trail pamoja kabla ya hatua inayofuata.',
            $bookingReference,
            $serviceReference
        );
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function bookingWorkspaceFocus(array $contextData): string
    {
        $escrowStatus = strtoupper($this->readString($contextData, 'escrow_status') ?? '');

        return match ($escrowStatus) {
            '' => 'finance',
            'CREATED' => 'finance',
            'ACTIVE' => 'delivery',
            'DISPUTED' => 'risk',
            'RELEASED' => 'delivery',
            default => 'messaging',
        };
    }

    /**
     * @param array<string, mixed> $contextData
     * @return array<string, mixed>
     */
    private function buildBookingWorkspaceRecommendation(array $contextData): array
    {
        $bookingId = $this->readInt($contextData, 'booking_id');
        $escrowStatus = strtoupper($this->readString($contextData, 'escrow_status') ?? '');
        $bookingStatus = strtoupper($this->readString($contextData, 'booking_status') ?? '');
        $href = $bookingId > 0 ? sprintf('/dashboard/bookings/%d', $bookingId) : '/dashboard/client#client-bookings-rail';

        if ($escrowStatus === '') {
            return [
                'title' => 'Create escrow before anything else',
                'detail' => 'The booking should enter protected flow first so later payment or delivery actions stay safe.',
                'action_label' => 'Open booking controls',
                'action_href' => $href . '#booking-controls-section',
                'tone' => 'info',
                'why' => 'Without escrow, payment and delivery context are still unprotected.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($escrowStatus === 'CREATED') {
            return [
                'title' => 'Start payment collection',
                'detail' => 'Escrow exists already, so the next clean step is collection rather than more side discussion.',
                'action_label' => 'Start collection',
                'action_href' => $href . '#booking-controls-section',
                'tone' => 'info',
                'why' => 'Escrow exists already, so collection is the next clean transition.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($escrowStatus === 'ACTIVE') {
            return [
                'title' => 'Stay in delivery review mode',
                'detail' => 'Keep the message trail and delivery facts clear until release or dispute becomes justified.',
                'action_label' => 'Open booking thread',
                'action_href' => $href . '#booking-thread-section',
                'tone' => 'success',
                'why' => 'Active escrow means the booking is already inside protected execution.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($escrowStatus === 'DISPUTED') {
            return [
                'title' => 'Hold the case on evidence',
                'detail' => 'The safest next step is to review facts, proof, and AI dispute guidance before any financial decision.',
                'action_label' => 'Review dispute context',
                'action_href' => $href . '#booking-controls-section',
                'tone' => 'warning',
                'why' => 'A disputed booking should stay anchored to facts and evidence until a decision is clear.',
                'confidence_label' => 'High confidence',
            ];
        }

        if ($escrowStatus === 'RELEASED' || $bookingStatus === 'COMPLETED') {
            return [
                'title' => 'Close out the booking cleanly',
                'detail' => 'Use review and final notes to finish the booking rather than reopening financial action.',
                'action_label' => 'Review timeline',
                'action_href' => $href . '#booking-timeline-section',
                'tone' => 'success',
                'why' => 'The financial action is already settled, so closure review is the most useful next step.',
                'confidence_label' => 'Medium confidence',
            ];
        }

        return [
            'title' => 'Read the current booking state first',
            'detail' => 'Use the timeline, controls, and thread together before taking the next action.',
            'action_label' => 'Open booking desk',
            'action_href' => $href,
            'tone' => 'info',
            'why' => 'The state is mixed enough that timeline, controls, and thread should be reviewed together.',
            'confidence_label' => 'Medium confidence',
        ];
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function serviceWorkspaceHint(array $contextData): string
    {
        $serviceId = $this->readInt($contextData, 'service_id');
        $serviceTitle = $this->readString($contextData, 'service_title');
        $serviceCategory = $this->readString($contextData, 'service_category');
        $isVendorOwner = $this->readBool($contextData, 'is_vendor_owner');
        $latestBookingId = $this->readInt($contextData, 'latest_booking_id');
        $isActive = $this->readBool($contextData, 'service_is_active');
        $descriptionLength = $this->readInt($contextData, 'description_length');
        $serviceReference = $serviceTitle !== null && $serviceTitle !== ''
            ? sprintf(' "%s"', $serviceTitle)
            : ($serviceId > 0 ? sprintf(' #%d', $serviceId) : '');

        if ($isVendorOwner) {
            if (!$isActive) {
                return sprintf(
                    ' Capability%s kwa sasa ni inactive, hivyo hatua ya kwanza ni kurekebisha clarity ya lane kabla ya relaunch.',
                    $serviceReference
                );
            }

            if ($descriptionLength > 0 && $descriptionLength < 120) {
                return sprintf(
                    ' Capability%s ina brief fupi sana, hivyo panua scope, deliverables, na boundaries kabla ya kutegemea buyer fit iwe strong.',
                    $serviceReference
                );
            }

            if ($latestBookingId > 0) {
                return sprintf(
                    ' Capability%s tayari ina booking ya karibu #%d, hivyo monitor delivery context kwanza kabla ya edits kubwa za lane.',
                    $serviceReference,
                    $latestBookingId
                );
            }

            return sprintf(
                ' Capability%s iko kwenye lane ya %s, hivyo keep starting price, title, na scope aligned ili buyer aelewe lane haraka.',
                $serviceReference,
                $serviceCategory ?? 'marketplace'
            );
        }

        if ($latestBookingId > 0) {
            return sprintf(
                ' Tayari una booking inayohusiana na lane%s, hivyo move safi ni kuendelea ndani ya booking workspace badala ya kufungua work mpya bila sababu.',
                $serviceReference
            );
        }

        return sprintf(
            ' Kwa lane%s, hakikisha scope, price, na proof signals vinaeleweka kabla ya kufungua work item mpya, hasa kama category ni %s.',
            $serviceReference,
            $serviceCategory ?? 'digital services'
        );
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function serviceWorkspaceFocus(array $contextData): string
    {
        $isVendorOwner = $this->readBool($contextData, 'is_vendor_owner');
        $latestBookingId = $this->readInt($contextData, 'latest_booking_id');
        $isActive = $this->readBool($contextData, 'service_is_active');
        $descriptionLength = $this->readInt($contextData, 'description_length');

        if ($isVendorOwner) {
            if (!$isActive || ($descriptionLength > 0 && $descriptionLength < 120)) {
                return 'capability';
            }

            if ($latestBookingId > 0) {
                return 'delivery';
            }

            return 'capability';
        }

        if ($latestBookingId > 0) {
            return 'delivery';
        }

        return 'lane';
    }

    /**
     * @param array<string, mixed> $contextData
     * @return array<string, mixed>
     */
    private function buildServiceWorkspaceRecommendation(array $contextData): array
    {
        $isVendorOwner = $this->readBool($contextData, 'is_vendor_owner');
        $latestBookingId = $this->readInt($contextData, 'latest_booking_id');
        $isActive = $this->readBool($contextData, 'service_is_active');
        $descriptionLength = $this->readInt($contextData, 'description_length');
        $serviceHref = $isVendorOwner ? '/dashboard/vendor-capabilities' : '/dashboard/request-services';

        if ($isVendorOwner) {
            if (!$isActive) {
                return [
                    'title' => 'Refine before relaunch',
                    'detail' => 'Inactive capabilities should be cleaned up before they go live again.',
                    'action_label' => 'Open capabilities',
                    'action_href' => $serviceHref,
                    'tone' => 'warning',
                    'why' => 'Inactive capabilities usually need clarity work before relaunch.',
                    'confidence_label' => 'High confidence',
                ];
            }

            if ($descriptionLength > 0 && $descriptionLength < 120) {
                return [
                    'title' => 'Expand the capability brief',
                    'detail' => 'A thin description usually creates ambiguity, so improve scope and deliverables first.',
                    'action_label' => 'Edit capability',
                    'action_href' => $serviceHref,
                    'tone' => 'info',
                    'why' => 'A short description often creates buyer ambiguity around scope and deliverables.',
                    'confidence_label' => 'High confidence',
                ];
            }

            if ($latestBookingId > 0) {
                return [
                    'title' => 'Check live delivery before editing',
                    'detail' => 'This capability already has recent execution context, so keep the live booking in view before major changes.',
                    'action_label' => 'Open latest booking',
                    'action_href' => sprintf('/dashboard/bookings/%d', $latestBookingId),
                    'tone' => 'success',
                    'why' => 'Recent live execution gives stronger guidance than editing the capability in isolation.',
                    'confidence_label' => 'Medium confidence',
                ];
            }

            return [
                'title' => 'Keep the lane sharp',
                'detail' => 'Review lane, starting price, and scope alignment so the capability remains easy to understand.',
                'action_label' => 'Review capabilities',
                'action_href' => $serviceHref,
                'tone' => 'success',
                'why' => 'The capability is live and calm enough for polish work rather than rescue work.',
                'confidence_label' => 'Medium confidence',
            ];
        }

        if ($latestBookingId > 0) {
            return [
                'title' => 'Continue from the active booking',
                'detail' => 'There is already tracked work attached to this lane, so continue there instead of starting over.',
                'action_label' => 'Open latest booking',
                'action_href' => sprintf('/dashboard/bookings/%d', $latestBookingId),
                'tone' => 'success',
                'why' => 'Tracked work already exists for this lane, so continuing there is safer than starting over.',
                'confidence_label' => 'High confidence',
            ];
        }

        return [
            'title' => 'Judge fit before booking',
            'detail' => 'Use lane context, proof, and related service types together before creating new work.',
            'action_label' => 'Review service lanes',
            'action_href' => $serviceHref,
            'tone' => 'info',
            'why' => 'No live booking is attached yet, so fit review is the right first step.',
            'confidence_label' => 'Medium confidence',
        ];
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function readInt(array $contextData, string $key): int
    {
        $value = $contextData[$key] ?? null;

        return is_numeric($value) ? (int) $value : 0;
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function readString(array $contextData, string $key): ?string
    {
        $value = $contextData[$key] ?? null;
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }

    /**
     * @param array<string, mixed> $contextData
     */
    private function readBool(array $contextData, string $key): bool
    {
        return (bool) ($contextData[$key] ?? false);
    }

    /**
     * @return array<int, string>
     */
    private function loadPreferredCategories(User $user): array
    {
        /** @var array<int, array{category?: mixed, usage_count?: mixed}> $rows */
        $rows = $this->em->getRepository(\App\Entity\Booking::class)
            ->createQueryBuilder('b')
            ->select('COALESCE(b.serviceCategorySnapshot, st.category) AS category, COUNT(b.id) AS usage_count')
            ->leftJoin('b.clientRequest', 'cr')
            ->leftJoin('cr.serviceType', 'st')
            ->where('b.client = :user')
            ->andWhere('COALESCE(b.serviceCategorySnapshot, st.category) IS NOT NULL')
            ->groupBy('COALESCE(b.serviceCategorySnapshot, st.category)')
            ->orderBy('usage_count', 'DESC')
            ->setParameter('user', $user)
            ->setMaxResults(3)
            ->getQuery()
            ->getArrayResult();

        $categories = [];
        foreach ($rows as $row) {
            $category = $row['category'] ?? null;
            if (is_string($category) && $category !== '') {
                $categories[] = $category;
            }
        }

        return $categories;
    }

    /**
     * @param array<int, string> $preferredCategories
     * @return array<int, VendorServiceCapability>
     */
    private function loadCandidateCapabilities(array $preferredCategories, int $limit): array
    {
        $qb = $this->em->getRepository(VendorServiceCapability::class)
            ->createQueryBuilder('c')
            ->join('c.serviceType', 'st')
            ->where('c.isActive = true')
            ->andWhere('c.approvedByAdmin = true')
            ->setMaxResults($limit * 4);

        if ($preferredCategories !== []) {
            $qb->andWhere('st.category IN (:categories)')
                ->setParameter('categories', $preferredCategories);
        }

        /** @var array<int, VendorServiceCapability> $capabilities */
        $capabilities = $qb->getQuery()->getResult();

        if (count($capabilities) >= $limit || $preferredCategories === []) {
            return $capabilities;
        }

        /** @var array<int, VendorServiceCapability> $fallbackCapabilities */
        $fallbackCapabilities = $this->em->getRepository(VendorServiceCapability::class)
            ->createQueryBuilder('c')
            ->where('c.isActive = true')
            ->andWhere('c.approvedByAdmin = true')
            ->setMaxResults($limit * 4)
            ->getQuery()
            ->getResult();

        $merged = [];
        foreach (array_merge($capabilities, $fallbackCapabilities) as $capability) {
            if (!$capability instanceof VendorServiceCapability || $capability->getId() === null) {
                continue;
            }

            $merged[$capability->getId()] = $capability;
        }

        return array_values($merged);
    }

    /**
     * @param array<int, VendorServiceCapability> $capabilities
     * @return array<int, array{avg_rating: float, review_count: int}>
     */
    private function loadReviewStats(array $capabilities): array
    {
        if ($capabilities === []) {
            return [];
        }

        $titles = [];
        $index = [];

        foreach ($capabilities as $capability) {
            $capabilityId = $capability->getId();
            if ($capabilityId === null) {
                continue;
            }

            $serviceType = $capability->getServiceType();
            $title = trim($serviceType->getName());
            if ($title === '') {
                continue;
            }

            $titles[] = $title;
            $index[$capabilityId] = [
                'title' => $title,
                'category' => trim((string) $serviceType->getCategory()),
            ];
        }

        if ($index === []) {
            return [];
        }

        /** @var array<int, array{service_title?: mixed, service_category?: mixed, avg_rating?: mixed, review_count?: mixed}> $rows */
        $rows = $this->em->getRepository(\App\Entity\Review::class)
            ->createQueryBuilder('r')
            ->select('b.serviceTitleSnapshot AS service_title, b.serviceCategorySnapshot AS service_category, AVG(r.rating) AS avg_rating, COUNT(r.id) AS review_count')
            ->join('r.booking', 'b')
            ->where('b.serviceTitleSnapshot IN (:serviceTitles)')
            ->groupBy('b.serviceTitleSnapshot, b.serviceCategorySnapshot')
            ->setParameter('serviceTitles', array_values(array_unique($titles)))
            ->getQuery()
            ->getArrayResult();

        $groupedStats = [];
        foreach ($rows as $row) {
            $serviceTitle = isset($row['service_title']) && is_string($row['service_title']) ? trim($row['service_title']) : '';
            if ($serviceTitle === '') {
                continue;
            }

            $avgRating = $row['avg_rating'] ?? 0.0;
            $reviewCount = $row['review_count'] ?? 0;
            $serviceCategory = isset($row['service_category']) && is_string($row['service_category']) ? trim($row['service_category']) : '';
            $groupedStats[$serviceTitle . '|' . $serviceCategory] = [
                'avg_rating' => is_numeric($avgRating) ? (float) $avgRating : 0.0,
                'review_count' => is_numeric($reviewCount) ? (int) $reviewCount : 0,
            ];
        }

        $stats = [];
        foreach ($index as $serviceId => $meta) {
            $key = $meta['title'] . '|' . $meta['category'];
            $fallbackKey = $meta['title'] . '|';
            $stats[$serviceId] = $groupedStats[$key] ?? $groupedStats[$fallbackKey] ?? [
                'avg_rating' => 0.0,
                'review_count' => 0,
            ];
        }

        return $stats;
    }

    /**
     * @param array<int, VendorServiceCapability> $capabilities
     * @return array<int, float>
     */
    private function loadVendorTrustScores(array $capabilities): array
    {
        $vendorIds = [];
        foreach ($capabilities as $capability) {
            $vendorUserId = $capability->getVendor()->getUser()->getId();
            if ($vendorUserId !== null) {
                $vendorIds[$vendorUserId] = $vendorUserId;
            }
        }

        if ($vendorIds === []) {
            return [];
        }

        /** @var array<int, array{vendor_id?: mixed, trust_score?: mixed}> $rows */
        $rows = $this->em->getRepository(VendorTrustProfile::class)
            ->createQueryBuilder('vtp')
            ->select('IDENTITY(vtp.vendor) AS vendor_id, vtp.calculatedTrustScore AS trust_score')
            ->where('IDENTITY(vtp.vendor) IN (:vendorIds)')
            ->setParameter('vendorIds', array_values($vendorIds))
            ->getQuery()
            ->getArrayResult();

        $scores = [];
        foreach ($rows as $row) {
            $vendorId = $row['vendor_id'] ?? null;
            if (!is_numeric($vendorId)) {
                continue;
            }

            $trustScore = $row['trust_score'] ?? 0.0;
            $scores[(int) $vendorId] = is_numeric($trustScore) ? (float) $trustScore : 0.0;
        }

        return $scores;
    }

    /**
     * @param array<int, string> $preferredCategories
     */
    private function categoryAffinityScore(VendorServiceCapability $capability, array $preferredCategories): float
    {
        if ($preferredCategories === []) {
            return 50.0;
        }

        $category = $capability->getServiceType()->getCategory();
        if ($category === null || $category === '') {
            return 30.0;
        }

        $position = array_search($category, $preferredCategories, true);
        if ($position === false) {
            return 20.0;
        }

        return match ($position) {
            0 => 100.0,
            1 => 80.0,
            default => 60.0,
        };
    }
}
