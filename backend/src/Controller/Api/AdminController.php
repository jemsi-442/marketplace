<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Controller\Concerns\ListQueryParamsTrait;
use App\Entity\Notification;
use App\Entity\User;
use App\Entity\VendorProfile;
use App\Entity\Booking;
use App\Entity\ClientRequest;
use App\Entity\Escrow;
use App\Entity\VendorServiceCapability;
use App\Service\NotificationService;
use App\Service\PasswordPolicy;
use App\Service\SignedDownloadTokenService;
use App\Service\VendorResumeStorage;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[Route('/api/admin')]
#[IsGranted('ROLE_ADMIN')]
final class AdminController extends AbstractController
{
    use ListQueryParamsTrait;

    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'account_type' => $this->resolveAccountType($user),
            'is_verified' => $user->isVerified(),
            'is_locked' => $user->isLocked(),
            'created_at' => $user->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    private function isPrivilegedAdmin(User $user): bool
    {
        $roles = $user->getRoles();

        return in_array('ROLE_ADMIN', $roles, true) || in_array('ROLE_SUPER_ADMIN', $roles, true);
    }

    private function isSuperAdmin(User $user): bool
    {
        return in_array('ROLE_SUPER_ADMIN', $user->getRoles(), true);
    }

    private function resolveAccountType(User $user): string
    {
        $roles = $user->getRoles();

        if (in_array('ROLE_SUPER_ADMIN', $roles, true)) {
            return 'super_admin';
        }

        if (in_array('ROLE_ADMIN', $roles, true)) {
            return 'admin';
        }

        if (in_array('ROLE_VENDOR', $roles, true)) {
            return 'vendor';
        }

        return 'client';
    }

    private function ensureVendorProfile(User $user, EntityManagerInterface $em): void
    {
        if (!in_array('ROLE_VENDOR', $user->getRoles(), true)) {
            return;
        }

        $existing = $em->getRepository(VendorProfile::class)->findOneBy(['user' => $user]);
        if ($existing instanceof VendorProfile) {
            return;
        }

        $vendorProfile = new VendorProfile();
        $vendorProfile->setUser($user);
        $vendorProfile->setCompanyName(sprintf('Vendor %s', $user->getId() ?? $user->getEmail()));

        $em->persist($vendorProfile);
    }

    /**
     * @param array<string, mixed> $data
     * @return array{email?: string, password?: string, roles?: array<int, string>, is_verified?: bool, is_locked?: bool}
     */
    private function normalizeUserPayload(array $data, User $actor): array
    {
        $normalized = [];

        if (array_key_exists('email', $data)) {
            $email = is_string($data['email']) ? strtolower(trim($data['email'])) : '';
            if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                throw new \DomainException('Provide a valid email address.');
            }

            $normalized['email'] = $email;
        }

        if (array_key_exists('password', $data)) {
            $password = is_string($data['password']) ? trim($data['password']) : '';
            if ($password === '') {
                throw new \DomainException('Provide a valid password.');
            }
            PasswordPolicy::validate($password);
            $normalized['password'] = $password;
        }

        if (array_key_exists('account_type', $data) || array_key_exists('roles', $data)) {
            $roles = [];

            if (array_key_exists('roles', $data) && is_array($data['roles'])) {
                $roles = array_values(array_filter(array_map(
                    static fn ($role): ?string => is_string($role) ? trim($role) : null,
                    $data['roles']
                )));
            } elseif (array_key_exists('account_type', $data) && is_string($data['account_type'])) {
                $roles = match (trim($data['account_type'])) {
                    'vendor' => ['ROLE_VENDOR'],
                    'admin' => ['ROLE_ADMIN'],
                    'super_admin' => ['ROLE_SUPER_ADMIN'],
                    default => ['ROLE_USER'],
                };
            }

            $roles = array_values(array_unique($roles));

            if ($roles === []) {
                $roles = ['ROLE_USER'];
            }

            $creatingPrivileged = in_array('ROLE_ADMIN', $roles, true) || in_array('ROLE_SUPER_ADMIN', $roles, true);
            if ($creatingPrivileged && !$this->isSuperAdmin($actor)) {
                throw new \DomainException('Only a super admin can manage admin accounts.');
            }

            $normalized['roles'] = $roles;
        }

        if (array_key_exists('is_verified', $data)) {
            $normalized['is_verified'] = filter_var($data['is_verified'], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? false;
        }

        if (array_key_exists('is_locked', $data)) {
            $normalized['is_locked'] = filter_var($data['is_locked'], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? false;
        }

        return $normalized;
    }

    private function normalizeUserView(?string $value): string
    {
        return match ($value) {
            'client', 'vendor', 'admin', 'locked', 'unverified' => $value,
            default => 'all',
        };
    }

    private function applyUserSearchFilter(\Doctrine\ORM\QueryBuilder $qb, string $search): void
    {
        if ($search === '') {
            return;
        }

        $qb
            ->andWhere('LOWER(u.email) LIKE :search')
            ->setParameter('search', '%' . $search . '%');
    }

    private function applyUserViewFilter(\Doctrine\ORM\QueryBuilder $qb, string $view): void
    {
        if ($view === 'client') {
            $qb
                ->andWhere('(u.roles NOT LIKE :vendorRole AND u.roles NOT LIKE :adminRole AND u.roles NOT LIKE :superAdminRole)')
                ->setParameter('vendorRole', '%ROLE_VENDOR%')
                ->setParameter('adminRole', '%ROLE_ADMIN%')
                ->setParameter('superAdminRole', '%ROLE_SUPER_ADMIN%');

            return;
        }

        if ($view === 'vendor') {
            $qb
                ->andWhere('u.roles LIKE :vendorRole')
                ->setParameter('vendorRole', '%ROLE_VENDOR%');

            return;
        }

        if ($view === 'admin') {
            $qb
                ->andWhere('(u.roles LIKE :adminRole OR u.roles LIKE :superAdminRole)')
                ->setParameter('adminRole', '%ROLE_ADMIN%')
                ->setParameter('superAdminRole', '%ROLE_SUPER_ADMIN%');

            return;
        }

        if ($view === 'locked') {
            $qb->andWhere('u.isLocked = true');

            return;
        }

        if ($view === 'unverified') {
            $qb->andWhere('u.isVerified = false');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeVendorVerification(VendorProfile $profile): array
    {
        $user = $profile->getUser();

        return [
            'id' => $profile->getId(),
            'vendor' => [
                'user_id' => $user->getId(),
                'email' => $user->getEmail(),
                'company_name' => $profile->getCompanyName(),
            ],
            'professional_headline' => $profile->getProfessionalHeadline(),
            'resume_highlights' => $profile->getResumeHighlights(),
            'resume_uploaded' => $profile->getResumeStoragePath() !== null,
            'resume_file_name' => $profile->getResumeOriginalName(),
            'resume_uploaded_at' => $profile->getResumeUploadedAt()?->format('Y-m-d H:i:s'),
            'verification_status' => $profile->getVerificationStatus(),
            'verification_badge_granted' => $profile->isVerificationBadgeGranted(),
            'verification_badge_granted_at' => $profile->getVerificationBadgeGrantedAt()?->format('Y-m-d H:i:s'),
            'verification_review_note' => $profile->getVerificationReviewNote(),
            'interview_score' => $profile->getInterviewScore(),
            'interview_submitted_at' => $profile->getInterviewSubmittedAt()?->format('Y-m-d H:i:s'),
            'interview_questions' => $profile->getInterviewQuestions() ?? [],
            'interview_answers' => $profile->getInterviewAnswers() ?? [],
            'interview_attempt_history' => $profile->getInterviewAttemptHistory() ?? [],
        ];
    }

    private function applyVendorVerificationSearchFilter(QueryBuilder $qb, string $search): void
    {
        if ($search === '') {
            return;
        }

        $normalized = '%' . mb_strtolower($search) . '%';
        $qb
            ->andWhere('LOWER(v.companyName) LIKE :search OR LOWER(u.email) LIKE :search OR LOWER(COALESCE(v.professionalHeadline, \'\')) LIKE :search')
            ->setParameter('search', $normalized);
    }

    private function applyVendorVerificationViewFilter(QueryBuilder $qb, string $view): void
    {
        match ($view) {
            'ready_review' => $qb
                ->andWhere('v.interviewSubmittedAt IS NOT NULL')
                ->andWhere('v.verificationBadgeGranted = false'),
            'badge_active' => $qb->andWhere('v.verificationBadgeGranted = true'),
            'needs_revision' => $qb->andWhere('v.verificationStatus = :needsRevision')->setParameter('needsRevision', VendorProfile::VERIFICATION_NEEDS_REVISION),
            'missing_resume' => $qb->andWhere('v.resumeStoragePath IS NULL'),
            default => null,
        };
    }

    #[Route('/dashboard-summary', name: 'admin_dashboard_summary', methods: ['GET'])]
    public function dashboardSummary(EntityManagerInterface $em): JsonResponse
    {
        $openRequests = (int) $em->getRepository(ClientRequest::class)
            ->createQueryBuilder('cr')
            ->select('COUNT(cr.id)')
            ->andWhere('cr.status IN (:openStatuses)')
            ->setParameter('openStatuses', [
                ClientRequest::STATUS_SUBMITTED,
                ClientRequest::STATUS_MATCHED,
                ClientRequest::STATUS_VENDOR_INTEREST_OPEN,
            ])
            ->getQuery()
            ->getSingleScalarResult();

        $pendingCapabilities = (int) $em->getRepository(VendorServiceCapability::class)
            ->createQueryBuilder('c')
            ->select('COUNT(c.id)')
            ->andWhere('c.approvedByAdmin = false')
            ->andWhere('c.reviewedAt IS NULL')
            ->getQuery()
            ->getSingleScalarResult();

        $activeBookings = (int) $em->getRepository(Booking::class)
            ->createQueryBuilder('b')
            ->select('COUNT(b.id)')
            ->andWhere('b.status <> :completedStatus')
            ->setParameter('completedStatus', Booking::STATUS_COMPLETED)
            ->getQuery()
            ->getSingleScalarResult();

        $disputedEscrows = (int) $em->getRepository(Escrow::class)
            ->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->where('e.status = :status')
            ->setParameter('status', Escrow::STATUS_DISPUTED)
            ->getQuery()
            ->getSingleScalarResult();

        return $this->json([
            'open_requests' => $openRequests,
            'pending_capabilities' => $pendingCapabilities,
            'active_bookings' => $activeBookings,
            'disputes' => $disputedEscrows,
        ]);
    }

    #[Route('/users', name: 'admin_users_list', methods: ['GET'])]
    public function listUsers(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $limit = $this->readListLimit($request, 10, 100);
        $page = $this->readPage($request);
        $search = strtolower(trim((string) $request->query->get('search', $request->query->get('q', ''))));
        $view = $this->normalizeUserView($request->query->get('view'));

        $repo = $em->getRepository(User::class);
        $summaryBaseQb = $repo
            ->createQueryBuilder('u')
            ->orderBy('u.id', 'DESC');

        $this->applyUserSearchFilter($summaryBaseQb, $search);

        $summary = [
            'total' => (int) (clone $summaryBaseQb)
                ->select('COUNT(u.id)')
                ->getQuery()
                ->getSingleScalarResult(),
            'clients' => (int) (clone $summaryBaseQb)
                ->select('COUNT(u.id)')
                ->andWhere('(u.roles NOT LIKE :vendorRole AND u.roles NOT LIKE :adminRole AND u.roles NOT LIKE :superAdminRole)')
                ->setParameter('vendorRole', '%ROLE_VENDOR%')
                ->setParameter('adminRole', '%ROLE_ADMIN%')
                ->setParameter('superAdminRole', '%ROLE_SUPER_ADMIN%')
                ->getQuery()
                ->getSingleScalarResult(),
            'vendors' => (int) (clone $summaryBaseQb)
                ->select('COUNT(u.id)')
                ->andWhere('u.roles LIKE :vendorRole')
                ->setParameter('vendorRole', '%ROLE_VENDOR%')
                ->getQuery()
                ->getSingleScalarResult(),
            'admins' => (int) (clone $summaryBaseQb)
                ->select('COUNT(u.id)')
                ->andWhere('(u.roles LIKE :adminRole OR u.roles LIKE :superAdminRole)')
                ->setParameter('adminRole', '%ROLE_ADMIN%')
                ->setParameter('superAdminRole', '%ROLE_SUPER_ADMIN%')
                ->getQuery()
                ->getSingleScalarResult(),
            'locked' => (int) (clone $summaryBaseQb)
                ->select('COUNT(u.id)')
                ->andWhere('u.isLocked = true')
                ->getQuery()
                ->getSingleScalarResult(),
            'unverified' => (int) (clone $summaryBaseQb)
                ->select('COUNT(u.id)')
                ->andWhere('u.isVerified = false')
                ->getQuery()
                ->getSingleScalarResult(),
        ];

        $qb = clone $summaryBaseQb;
        $this->applyUserViewFilter($qb, $view);

        $totalItems = (int) (clone $qb)
            ->select('COUNT(u.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $totalPages = max(1, (int) ceil($totalItems / $limit));
        $page = min($page, $totalPages);

        $users = $qb
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
        $result = [];

        foreach ($users as $user) {
            $result[] = $this->serializeUser($user);
        }

        return $this->json([
            'items' => $result,
            'page' => $page,
            'page_size' => $limit,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
            'summary' => $summary,
        ]);
    }

    #[Route('/users', name: 'admin_users_create', methods: ['POST'])]
    public function createUser(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $actor = $this->getUser();
        if (!$actor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid payload'], 400);
        }

        try {
            $payload = $this->normalizeUserPayload($data, $actor);
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        if (!isset($payload['email'], $payload['password'])) {
            return $this->json(['error' => 'Email and password are required.'], 400);
        }

        if ($em->getRepository(User::class)->findOneBy(['email' => $payload['email']])) {
            return $this->json(['error' => 'Email already exists.'], 409);
        }

        $user = new User();
        $user->setEmail($payload['email']);
        $user->setRoles($payload['roles'] ?? ['ROLE_USER']);
        $user->setIsVerified($payload['is_verified'] ?? true);
        $user->setIsLocked($payload['is_locked'] ?? false);
        $user->setPassword($this->passwordHasher->hashPassword($user, $payload['password']));

        $em->persist($user);
        $this->ensureVendorProfile($user, $em);
        $em->flush();

        return $this->json([
            'message' => 'User account created.',
            'user' => $this->serializeUser($user),
        ], 201);
    }

    #[Route('/users/{id}', name: 'admin_users_show', methods: ['GET'])]
    public function showUser(User $user): JsonResponse
    {
        $actor = $this->getUser();
        if (!$actor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($this->isPrivilegedAdmin($user) && !$this->isSuperAdmin($actor) && $actor->getId() !== $user->getId()) {
            return $this->json(['error' => 'Only a super admin can open another admin account here.'], 403);
        }

        return $this->json($this->serializeUser($user));
    }

    #[Route('/users/{id}', name: 'admin_users_update', methods: ['PUT', 'PATCH'])]
    public function updateUser(User $user, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $actor = $this->getUser();
        if (!$actor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($actor->getId() === $user->getId()) {
            return $this->json(['error' => 'Use your own account settings for your current admin account.'], 403);
        }

        if ($this->isPrivilegedAdmin($user) && !$this->isSuperAdmin($actor)) {
            return $this->json(['error' => 'Only a super admin can update another admin account.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid payload'], 400);
        }

        try {
            $payload = $this->normalizeUserPayload($data, $actor);
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        if (isset($payload['email']) && $payload['email'] !== $user->getEmail()) {
            $existing = $em->getRepository(User::class)->findOneBy(['email' => $payload['email']]);
            if ($existing instanceof User && $existing->getId() !== $user->getId()) {
                return $this->json(['error' => 'Email already exists.'], 409);
            }
            $user->setEmail($payload['email']);
        }

        if (isset($payload['roles'])) {
            $user->setRoles($payload['roles']);
            $this->ensureVendorProfile($user, $em);
        }

        if (isset($payload['is_verified'])) {
            $user->setIsVerified($payload['is_verified']);
        }

        if (isset($payload['is_locked'])) {
            $user->setIsLocked($payload['is_locked']);
            if ($payload['is_locked'] === false) {
                $user->resetFailedLoginAttempts();
            }
        }

        if (isset($payload['password'])) {
            $user->setPassword($this->passwordHasher->hashPassword($user, $payload['password']));
        }

        $em->flush();

        return $this->json([
            'message' => 'User account updated.',
            'user' => $this->serializeUser($user),
        ]);
    }

    #[Route('/users/{id}', name: 'admin_users_delete', methods: ['DELETE'])]
    public function deleteUser(User $user, EntityManagerInterface $em): JsonResponse
    {
        $actor = $this->getUser();
        if (!$actor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($actor->getId() === $user->getId()) {
            return $this->json(['error' => 'You cannot delete your own admin account.'], 403);
        }

        if ($this->isPrivilegedAdmin($user) && !$this->isSuperAdmin($actor)) {
            return $this->json(['error' => 'Only a super admin can delete another admin account.'], 403);
        }

        try {
            $em->remove($user);
            $em->flush();
        } catch (\Throwable) {
            return $this->json([
                'error' => 'This user is linked to platform records and cannot be deleted safely.',
            ], 409);
        }

        return $this->json([
            'message' => 'User account deleted.',
        ]);
    }

    #[Route('/users/{id}/lock', name: 'admin_user_lock', methods: ['POST'])]
    public function lockUser(User $user, EntityManagerInterface $em): JsonResponse
    {
        $actor = $this->getUser();
        if (!$actor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($actor->getId() === $user->getId()) {
            return $this->json(['error' => 'You cannot lock your own admin account'], 403);
        }

        if ($this->isPrivilegedAdmin($user) && !in_array('ROLE_SUPER_ADMIN', $actor->getRoles(), true)) {
            return $this->json(['error' => 'Only a super admin can lock another admin account'], 403);
        }

        $user->setIsLocked(true);
        $em->flush();
        $this->notificationService->notify(
            $user,
            'Account locked',
            'Your account has been locked by a platform administrator for review.',
            Notification::CATEGORY_RISK
        );

        return $this->json([
            'message' => 'User account locked',
            'user' => $this->serializeUser($user),
        ]);
    }

    #[Route('/users/{id}/unlock', name: 'admin_user_unlock', methods: ['POST'])]
    public function unlockUser(User $user, EntityManagerInterface $em): JsonResponse
    {
        $actor = $this->getUser();
        if (!$actor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($actor->getId() === $user->getId()) {
            return $this->json(['error' => 'You cannot unlock your own admin account through this route'], 403);
        }

        if ($this->isPrivilegedAdmin($user) && !in_array('ROLE_SUPER_ADMIN', $actor->getRoles(), true)) {
            return $this->json(['error' => 'Only a super admin can unlock another admin account'], 403);
        }

        $user->setIsLocked(false);
        $user->resetFailedLoginAttempts();
        $em->flush();
        $this->notificationService->notify(
            $user,
            'Account unlocked',
            'Your account has been unlocked by a platform administrator and access has been restored.',
            Notification::CATEGORY_RISK
        );

        return $this->json([
            'message' => 'User account unlocked',
            'user' => $this->serializeUser($user),
        ]);
    }

    #[Route('/vendors', name: 'admin_vendors_list', methods: ['GET'])]
    public function listVendors(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $limit = $this->readListLimit($request);
        $vendors = $em->getRepository(VendorProfile::class)
            ->createQueryBuilder('vp')
            ->orderBy('vp.id', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
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

    #[Route('/vendor-verifications', name: 'admin_vendor_verifications_list', methods: ['GET'])]
    public function listVendorVerifications(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $limit = $this->readListLimit($request, 10, 50);
        $page = $this->readPage($request);
        $search = $this->readSearch($request);
        $view = $this->readEnumFilter($request, ['all', 'ready_review', 'badge_active', 'needs_revision', 'missing_resume']);

        $baseQb = $em->getRepository(VendorProfile::class)
            ->createQueryBuilder('v')
            ->join('v.user', 'u');

        $this->applyVendorVerificationSearchFilter($baseQb, $search);

        $summaryBaseQb = clone $baseQb;
        $itemsQb = clone $baseQb;
        $this->applyVendorVerificationViewFilter($itemsQb, $view);

        $totalItems = (int) (clone $itemsQb)
            ->select('COUNT(v.id)')
            ->getQuery()
            ->getSingleScalarResult();

        [$page, $totalPages] = $this->clampPageWithinTotal($page, $totalItems, $limit);

        $profiles = $itemsQb
            ->select('v', 'u')
            ->orderBy('v.resumeUploadedAt', 'DESC')
            ->addOrderBy('v.id', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return $this->json([
            'items' => array_map(fn (VendorProfile $profile): array => $this->serializeVendorVerification($profile), $profiles),
            'page' => $page,
            'page_size' => $limit,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
            'summary' => [
                'total' => (int) (clone $summaryBaseQb)->select('COUNT(v.id)')->getQuery()->getSingleScalarResult(),
                'ready_review' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(v.id)')
                    ->andWhere('v.interviewSubmittedAt IS NOT NULL')
                    ->andWhere('v.verificationBadgeGranted = false')
                    ->getQuery()
                    ->getSingleScalarResult(),
                'badge_active' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(v.id)')
                    ->andWhere('v.verificationBadgeGranted = true')
                    ->getQuery()
                    ->getSingleScalarResult(),
                'needs_revision' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(v.id)')
                    ->andWhere('v.verificationStatus = :needsRevision')
                    ->setParameter('needsRevision', VendorProfile::VERIFICATION_NEEDS_REVISION)
                    ->getQuery()
                    ->getSingleScalarResult(),
                'missing_resume' => (int) (clone $summaryBaseQb)
                    ->select('COUNT(v.id)')
                    ->andWhere('v.resumeStoragePath IS NULL')
                    ->getQuery()
                    ->getSingleScalarResult(),
            ],
        ]);
    }

    #[Route('/vendor-verifications/{id}', name: 'admin_vendor_verifications_show', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function showVendorVerification(VendorProfile $profile): JsonResponse
    {
        return $this->json($this->serializeVendorVerification($profile));
    }

    #[Route('/vendor-verifications/{id}/resume-link', name: 'admin_vendor_verifications_resume_link', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function vendorVerificationResumeLink(
        VendorProfile $profile,
        SignedDownloadTokenService $signedDownloadTokenService,
        VendorResumeStorage $resumeStorage
    ): JsonResponse
    {
        $storagePath = $profile->getResumeStoragePath();
        if ($storagePath === null) {
            return $this->json(['error' => 'Resume not found'], Response::HTTP_NOT_FOUND);
        }

        $remoteLink = $resumeStorage->createTemporaryDownloadLink($storagePath);
        if (is_array($remoteLink) && isset($remoteLink['url'], $remoteLink['expires'])) {
            return $this->json([
                'url' => (string) $remoteLink['url'],
                'expires' => (int) $remoteLink['expires'],
                'signature' => '',
                'expires_at' => date(DATE_ATOM, (int) $remoteLink['expires']),
            ]);
        }

        $token = $signedDownloadTokenService->issue('admin_vendor_resume_download', $storagePath);

        return $this->json([
            'url' => sprintf(
                '/api/admin/vendor-verifications/%d/resume?expires=%d&signature=%s',
                (int) $profile->getId(),
                $token['expires'],
                $token['signature']
            ),
            'expires' => $token['expires'],
            'signature' => $token['signature'],
            'expires_at' => date(DATE_ATOM, $token['expires']),
        ]);
    }

    #[Route('/vendor-verifications/{id}/resume', name: 'admin_vendor_verifications_resume', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function downloadVendorVerificationResume(
        VendorProfile $profile,
        Request $request,
        SignedDownloadTokenService $signedDownloadTokenService,
        VendorResumeStorage $resumeStorage
    ): Response
    {
        $storagePath = $profile->getResumeStoragePath();
        if ($storagePath === null) {
            return $this->json(['error' => 'Resume not found'], Response::HTTP_NOT_FOUND);
        }

        $expires = (int) $request->query->get('expires', 0);
        $signature = $request->query->get('signature');
        if (!$signedDownloadTokenService->isValid('admin_vendor_resume_download', $storagePath, $expires, is_string($signature) ? $signature : null)) {
            return $this->json(['error' => 'Download link is invalid or has expired'], Response::HTTP_FORBIDDEN);
        }

        $absolutePath = $resumeStorage->resolveStoredResumePath($storagePath);
        if ($absolutePath === null) {
            return $this->json(['error' => 'Resume not found'], Response::HTTP_NOT_FOUND);
        }

        $response = new BinaryFileResponse($absolutePath);
        $response->setPrivate();
        $response->headers->set('Content-Type', $profile->getResumeMimeType() ?: 'application/octet-stream');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->setContentDisposition('attachment', $profile->getResumeOriginalName() ?? basename($absolutePath));

        return $response;
    }

    #[Route('/vendor-verifications/{id}/review', name: 'admin_vendor_verifications_review', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function reviewVendorVerification(VendorProfile $profile, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $actor = $this->getUser();
        if (!$actor instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], Response::HTTP_BAD_REQUEST);
        }

        $decision = isset($data['decision']) && is_string($data['decision']) ? trim($data['decision']) : '';
        $reviewNote = isset($data['review_note']) && is_string($data['review_note']) ? trim($data['review_note']) : null;

        if (!in_array($decision, ['approve', 'revoke'], true)) {
            return $this->json(['error' => 'decision must be approve or revoke'], Response::HTTP_BAD_REQUEST);
        }

        if ($decision === 'revoke' && ($reviewNote === null || $reviewNote === '')) {
            return $this->json(['error' => 'review_note is required when revoking a blue tick'], Response::HTTP_BAD_REQUEST);
        }

        if ($decision === 'approve') {
            $profile->approveVerificationBadge($reviewNote);
        } else {
            $profile->revokeVerificationBadge($reviewNote);
        }

        $em->flush();

        return $this->json([
            'message' => $decision === 'approve'
                ? 'Vendor verification approved and blue tick is active.'
                : 'Vendor verification badge revoked and the profile now needs revision.',
            'profile' => $this->serializeVendorVerification($profile),
        ]);
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
