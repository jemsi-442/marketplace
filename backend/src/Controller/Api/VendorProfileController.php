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
use App\Service\SignedDownloadTokenService;
use App\Service\SignedObjectTransferTokenService;
use App\Service\VendorResumeStorage;
use App\Service\VendorVerificationInterviewService;
use App\Service\VendorWalletService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/vendor/profile')]
#[IsGranted('ROLE_VENDOR')]
class VendorProfileController extends AbstractController
{
    public function __construct(
        #[Autowire(service: 'limiter.vendor_resume_upload')]
        private readonly RateLimiterFactory $vendorResumeUploadLimiter,
    ) {
    }

    /**
     * @param list<array<string, mixed>> $questions
     * @param list<array<string, mixed>> $results
     * @return array<string, mixed>
     */
    private function buildInterviewFeedbackSummary(array $questions, array $results): array
    {
        $strongSignals = [];
        $missingSignals = [];
        $genericFlags = 0;
        $timelineStrength = 0;
        $weakAnswers = 0;
        $strongAnswers = 0;

        foreach ($questions as $question) {
            if (!is_array($question)) {
                continue;
            }

            $questionId = isset($question['id']) && is_string($question['id']) ? $question['id'] : '';
            if ($questionId === '') {
                continue;
            }

            $result = null;
            foreach ($results as $candidate) {
                if (is_array($candidate) && (($candidate['question_id'] ?? null) === $questionId)) {
                    $result = $candidate;
                    break;
                }
            }

            if (!is_array($result)) {
                continue;
            }

            $score = isset($result['score']) ? (int) $result['score'] : 0;
            if ($score >= 70) {
                ++$strongAnswers;
            } elseif ($score > 0 && $score < 62) {
                ++$weakAnswers;
            }

            $genericFlags += isset($result['generic_phrase_hits']) ? (int) $result['generic_phrase_hits'] : 0;
            $timelineStrength += isset($result['timeline_signal_hits']) ? (int) $result['timeline_signal_hits'] : 0;
            $timelineStrength += isset($result['number_signals']) ? (int) $result['number_signals'] : 0;

            $answer = isset($result['answer']) && is_string($result['answer']) ? mb_strtolower($result['answer']) : '';
            $signals = isset($question['practical_signals']) && is_array($question['practical_signals']) ? $question['practical_signals'] : [];

            foreach ($signals as $signal) {
                if (!is_string($signal) || trim($signal) === '') {
                    continue;
                }

                if ($answer !== '' && str_contains($answer, mb_strtolower($signal))) {
                    $strongSignals[] = $signal;
                } else {
                    $missingSignals[] = $signal;
                }
            }
        }

        $strongSignals = array_values(array_slice(array_unique($strongSignals), 0, 6));
        $missingSignals = array_values(array_slice(array_diff(array_unique($missingSignals), $strongSignals), 0, 6));

        return [
            'strong_answers' => $strongAnswers,
            'weak_answers' => $weakAnswers,
            'generic_flags' => $genericFlags,
            'timeline_strength' => $timelineStrength,
            'strong_signals' => $strongSignals,
            'missing_signals' => $missingSignals,
            'strength_summary' => $strongSignals !== []
                ? sprintf('Strong proof showed up in areas like %s.', implode(', ', $strongSignals))
                : 'Your answers need clearer lane-specific proof from real work.',
            'gap_summary' => $missingSignals !== []
                ? sprintf('Add more practical detail around %s next time.', implode(', ', $missingSignals))
                : ($genericFlags > 0
                    ? 'Reduce polished filler wording and explain the real working steps behind it.'
                    : 'No major proof gap stood out in this pass.'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeProfile(VendorProfile $profile, User $user): array
    {
        return [
            'exists' => true,
            'id' => $profile->getId(),
            'company_name' => $profile->getCompanyName(),
            'bio' => $profile->getBio(),
            'website' => $profile->getWebsite(),
            'portfolio_link' => $profile->getPortfolioLink(),
            'professional_headline' => $profile->getProfessionalHeadline(),
            'resume_highlights' => $profile->getResumeHighlights(),
            'resume_uploaded' => $profile->getResumeStoragePath() !== null,
            'resume_file_name' => $profile->getResumeOriginalName(),
            'resume_mime_type' => $profile->getResumeMimeType(),
            'resume_uploaded_at' => $profile->getResumeUploadedAt()?->format('Y-m-d H:i:s'),
            'verification_status' => $profile->getVerificationStatus(),
            'verification_badge_granted' => $profile->isVerificationBadgeGranted(),
            'verification_badge_granted_at' => $profile->getVerificationBadgeGrantedAt()?->format('Y-m-d H:i:s'),
            'verification_review_note' => $profile->getVerificationReviewNote(),
            'interview_score' => $profile->getInterviewScore(),
            'interview_submitted_at' => $profile->getInterviewSubmittedAt()?->format('Y-m-d H:i:s'),
            'interview_questions' => $profile->getInterviewQuestions() ?? [],
            'interview_attempt_history' => $profile->getInterviewAttemptHistory() ?? [],
            'user_id' => $user->getId(),
        ];
    }

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

        return $this->json($this->serializeProfile($profile, $user));
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
        if ($profile->isVerificationBadgeGranted() && $serviceTypeIds !== []) {
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
            'verification_status' => $profile->getVerificationStatus(),
            'verification_badge_granted' => $profile->isVerificationBadgeGranted(),
            'resume_uploaded' => $profile->getResumeStoragePath() !== null,
            'interview_score' => $profile->getInterviewScore(),
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
        $profile->setProfessionalHeadline(isset($data['professionalHeadline']) && is_string($data['professionalHeadline']) ? $data['professionalHeadline'] : null);
        $profile->setResumeHighlights(isset($data['resumeHighlights']) && is_string($data['resumeHighlights']) ? $data['resumeHighlights'] : null);

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

        $verificationFieldsChanged = false;

        if (array_key_exists('professionalHeadline', $data)) {
            $profile->setProfessionalHeadline($data['professionalHeadline'] !== null ? (string) $data['professionalHeadline'] : null);
            $verificationFieldsChanged = true;
        }

        if (array_key_exists('resumeHighlights', $data)) {
            $profile->setResumeHighlights($data['resumeHighlights'] !== null ? (string) $data['resumeHighlights'] : null);
            $verificationFieldsChanged = true;
        }

        if ($verificationFieldsChanged && $profile->getResumeStoragePath() !== null) {
            $profile->resetVerificationProgress();
        }

        $em->flush();

        return $this->json([
            'message' => 'Vendor profile updated'
        ]);
    }

    #[Route('/resume', methods: ['POST'])]
    public function uploadResume(
        Request $request,
        EntityManagerInterface $em,
        VendorResumeStorage $resumeStorage
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $profile = $user->getVendorProfile();
        if (!$profile instanceof VendorProfile) {
            return $this->json(['error' => 'Vendor profile not found'], Response::HTTP_NOT_FOUND);
        }

        $ipAddress = $request->getClientIp() ?? 'unknown';
        $limiter = $this->vendorResumeUploadLimiter->create(sprintf('%d|%s', $user->getId() ?? 0, $ipAddress));
        if (!$limiter->consume()->isAccepted()) {
            return $this->json([
                'error' => 'Too many resume uploads. Try again after a short break.',
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $file = $request->files->get('resume');
        if (!$file) {
            return $this->json(['error' => 'resume file is required'], Response::HTTP_BAD_REQUEST);
        }

        $oldStoragePath = $profile->getResumeStoragePath();

        try {
            $storedFile = $resumeStorage->storeForVendor($file, (int) $profile->getId());
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        } catch (\RuntimeException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $profile->replaceResume(
            $storedFile['file_name'],
            $storedFile['storage_path'],
            $storedFile['mime_type']
        );

        $em->flush();

        if ($oldStoragePath !== null && $oldStoragePath !== $storedFile['storage_path']) {
            $resumeStorage->removeStoredResume($oldStoragePath);
        }

        return $this->json([
            'message' => 'Resume uploaded. Interview progress has been refreshed with the new file.',
            'profile' => $this->serializeProfile($profile, $user),
        ]);
    }

    #[Route('/resume/direct-upload/prepare', methods: ['POST'])]
    public function prepareDirectResumeUpload(
        Request $request,
        VendorResumeStorage $resumeStorage,
        SignedObjectTransferTokenService $signedObjectTransferTokenService
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $profile = $user->getVendorProfile();
        if (!$profile instanceof VendorProfile) {
            return $this->json(['error' => 'Vendor profile not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], Response::HTTP_BAD_REQUEST);
        }

        $fileName = isset($data['file_name']) && is_string($data['file_name']) ? trim($data['file_name']) : '';
        $mimeType = isset($data['mime_type']) && is_string($data['mime_type']) ? trim($data['mime_type']) : '';
        if ($fileName === '') {
            return $this->json(['error' => 'file_name is required'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $resumeStorage->assertSupportedMimeType($mimeType);
            $prepared = $resumeStorage->prepareRemoteUploadForVendor($fileName, $mimeType, (int) $profile->getId());
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        if ($prepared === null) {
            return $this->json([
                'error' => 'Direct resume upload is not available for the current storage driver.',
            ], Response::HTTP_CONFLICT);
        }

        $token = $signedObjectTransferTokenService->issue('vendor_resume_direct_upload', $prepared['storage_path'], [
            'file_name' => $prepared['file_name'],
            'mime_type' => $prepared['mime_type'],
        ]);

        return $this->json([
            'message' => 'Direct resume upload is ready.',
            'file_name' => $prepared['file_name'],
            'mime_type' => $prepared['mime_type'],
            'storage_path' => $prepared['storage_path'],
            'upload' => [
                'url' => $prepared['upload']['url'],
                'method' => $prepared['upload']['method'],
                'headers' => $prepared['upload']['headers'],
                'expires' => $prepared['upload']['expires'],
                'expires_at' => date(DATE_ATOM, $prepared['upload']['expires']),
            ],
            'finalize' => [
                'url' => '/api/vendor/profile/resume/direct-upload/finalize',
                'expires' => $token['expires'],
                'expires_at' => date(DATE_ATOM, $token['expires']),
                'token' => $token['signature'],
            ],
        ]);
    }

    #[Route('/resume/direct-upload/finalize', methods: ['POST'])]
    public function finalizeDirectResumeUpload(
        Request $request,
        EntityManagerInterface $em,
        VendorResumeStorage $resumeStorage,
        SignedObjectTransferTokenService $signedObjectTransferTokenService
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $profile = $user->getVendorProfile();
        if (!$profile instanceof VendorProfile) {
            return $this->json(['error' => 'Vendor profile not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], Response::HTTP_BAD_REQUEST);
        }

        $fileName = isset($data['file_name']) && is_string($data['file_name']) ? trim($data['file_name']) : '';
        $storagePath = isset($data['storage_path']) && is_string($data['storage_path']) ? trim($data['storage_path']) : '';
        $mimeType = isset($data['mime_type']) && is_string($data['mime_type']) ? trim($data['mime_type']) : '';
        $token = isset($data['upload_token']) && is_string($data['upload_token']) ? trim($data['upload_token']) : '';
        $expires = isset($data['expires']) ? (int) $data['expires'] : 0;

        if ($fileName === '' || $storagePath === '' || $mimeType === '' || $token === '' || $expires <= 0) {
            return $this->json(['error' => 'file_name, storage_path, mime_type, upload_token, and expires are required'], Response::HTTP_BAD_REQUEST);
        }

        if (!$signedObjectTransferTokenService->isValid('vendor_resume_direct_upload', $storagePath, [
            'file_name' => $fileName,
            'mime_type' => $mimeType,
        ], $expires, $token)) {
            return $this->json(['error' => 'Upload finalize token is invalid or has expired'], Response::HTTP_FORBIDDEN);
        }

        $oldStoragePath = $profile->getResumeStoragePath();
        $absolutePath = $resumeStorage->resolveStoredResumePath($storagePath);
        if ($absolutePath === null) {
            return $this->json(['error' => 'Uploaded resume file was not found'], Response::HTTP_NOT_FOUND);
        }

        try {
            $validated = $resumeStorage->validateStoredResumeObject($absolutePath, $fileName);
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        } catch (\RuntimeException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $profile->replaceResume(
            $fileName,
            $storagePath,
            $validated['mime_type']
        );

        $em->flush();

        if ($oldStoragePath !== null && $oldStoragePath !== $storagePath) {
            $resumeStorage->removeStoredResume($oldStoragePath);
        }

        return $this->json([
            'message' => 'Direct resume upload has been verified and saved.',
            'profile' => $this->serializeProfile($profile, $user),
        ]);
    }

    #[Route('/resume/link', methods: ['GET'])]
    public function resumeDownloadLink(
        SignedDownloadTokenService $signedDownloadTokenService,
        VendorResumeStorage $resumeStorage
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $profile = $user->getVendorProfile();
        if (!$profile instanceof VendorProfile || $profile->getResumeStoragePath() === null) {
            return $this->json(['error' => 'Resume not found'], Response::HTTP_NOT_FOUND);
        }

        $remoteLink = $resumeStorage->createTemporaryDownloadLink($profile->getResumeStoragePath());
        if (is_array($remoteLink) && isset($remoteLink['url'], $remoteLink['expires'])) {
            return $this->json([
                'url' => (string) $remoteLink['url'],
                'expires' => (int) $remoteLink['expires'],
                'signature' => '',
                'expires_at' => date(DATE_ATOM, (int) $remoteLink['expires']),
            ]);
        }

        $token = $signedDownloadTokenService->issue('vendor_resume_download', $profile->getResumeStoragePath());

        return $this->json([
            'url' => sprintf('/api/vendor/profile/resume/download?expires=%d&signature=%s', $token['expires'], $token['signature']),
            'expires' => $token['expires'],
            'signature' => $token['signature'],
            'expires_at' => date(DATE_ATOM, $token['expires']),
        ]);
    }

    #[Route('/resume/download', methods: ['GET'])]
    public function downloadResume(
        Request $request,
        SignedDownloadTokenService $signedDownloadTokenService,
        VendorResumeStorage $resumeStorage
    ): Response {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $profile = $user->getVendorProfile();
        if (!$profile instanceof VendorProfile) {
            return $this->json(['error' => 'Vendor profile not found'], Response::HTTP_NOT_FOUND);
        }

        $storagePath = $profile->getResumeStoragePath();
        if ($storagePath === null) {
            return $this->json(['error' => 'Resume not found'], Response::HTTP_NOT_FOUND);
        }

        $expires = (int) $request->query->get('expires', 0);
        $signature = $request->query->get('signature');
        if (!$signedDownloadTokenService->isValid('vendor_resume_download', $storagePath, $expires, is_string($signature) ? $signature : null)) {
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

    #[Route('/interview/generate', methods: ['POST'])]
    public function generateInterview(
        EntityManagerInterface $em,
        VendorServiceCapabilityRepository $capabilityRepository,
        VendorVerificationInterviewService $interviewService
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $profile = $user->getVendorProfile();
        if (!$profile instanceof VendorProfile) {
            return $this->json(['error' => 'Vendor profile not found'], Response::HTTP_NOT_FOUND);
        }

        if ($profile->getResumeStoragePath() === null) {
            return $this->json(['error' => 'Upload a resume before generating interview questions.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($profile->getResumeHighlights() === null || trim($profile->getResumeHighlights()) === '') {
            return $this->json(['error' => 'Add a short resume highlights summary before generating interview questions.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $capabilities = $capabilityRepository->findBy([
            'vendor' => $profile,
            'isActive' => true,
        ]);

        if ($capabilities === []) {
            return $this->json(['error' => 'Activate at least one capability lane before generating the interview.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $questions = $interviewService->generateQuestions($profile, $capabilities);
        $profile->markInterviewReady($questions);
        $em->flush();

        return $this->json([
            'message' => 'Vendor interview questions generated.',
            'questions' => $questions,
            'profile' => $this->serializeProfile($profile, $user),
        ]);
    }

    #[Route('/interview/submit', methods: ['POST'])]
    public function submitInterview(
        Request $request,
        EntityManagerInterface $em,
        VendorVerificationInterviewService $interviewService
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $profile = $user->getVendorProfile();
        if (!$profile instanceof VendorProfile) {
            return $this->json(['error' => 'Vendor profile not found'], Response::HTTP_NOT_FOUND);
        }

        $questions = $profile->getInterviewQuestions() ?? [];
        if ($questions === []) {
            return $this->json(['error' => 'Generate interview questions before submitting answers.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], Response::HTTP_BAD_REQUEST);
        }

        $answers = isset($data['answers']) && is_array($data['answers']) ? $data['answers'] : [];
        if ($answers === []) {
            return $this->json(['error' => 'answers are required'], Response::HTTP_BAD_REQUEST);
        }

        $result = $interviewService->evaluateAnswers($questions, $answers);
        $profile->applyInterviewResult($result['results'], $result['score'], $result['passed'], $result['note']);
        $em->flush();

        return $this->json([
            'message' => $result['note'],
            'score' => $result['score'],
            'passed' => $result['passed'],
            'feedback_summary' => $this->buildInterviewFeedbackSummary($questions, $result['results']),
            'profile' => $this->serializeProfile($profile, $user),
        ]);
    }
}
