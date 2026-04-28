<?php

namespace App\Entity;

use App\Repository\VendorProfileRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: VendorProfileRepository::class)]
#[ORM\Table(name: 'vendor_profile')]
class VendorProfile
{
    public const VERIFICATION_NOT_STARTED = 'not_started';
    public const VERIFICATION_RESUME_UPLOADED = 'resume_uploaded';
    public const VERIFICATION_INTERVIEW_READY = 'interview_ready';
    public const VERIFICATION_NEEDS_REVISION = 'needs_revision';
    public const VERIFICATION_VERIFIED = 'verified';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: User::class, inversedBy: 'vendorProfile')]
    #[ORM\JoinColumn(nullable: false)]
    private User $user;

    #[ORM\Column(type: 'string', length: 255)]
    #[Assert\NotBlank]
    private string $companyName = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $bio = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $website = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $portfolioLink = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $professionalHeadline = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $resumeHighlights = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $resumeOriginalName = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $resumeStoragePath = null;

    #[ORM\Column(type: 'string', length: 120, nullable: true)]
    private ?string $resumeMimeType = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $resumeUploadedAt = null;

    #[ORM\Column(type: 'string', length: 40, options: ['default' => self::VERIFICATION_NOT_STARTED])]
    private string $verificationStatus = self::VERIFICATION_NOT_STARTED;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $verificationBadgeGranted = false;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $verificationBadgeGrantedAt = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $interviewQuestions = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $interviewAnswers = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $interviewAttemptHistory = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $interviewScore = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $interviewSubmittedAt = null;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $verificationReviewNote = null;

    // =====================
    // Getters & Setters
    // =====================
    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function setUser(User $user): self
    {
        $this->user = $user;
        return $this;
    }

    public function getCompanyName(): string
    {
        return $this->companyName;
    }

    public function setCompanyName(string $companyName): self
    {
        $this->companyName = $companyName;
        return $this;
    }

    public function getBio(): ?string
    {
        return $this->bio;
    }

    public function setBio(?string $bio): self
    {
        $this->bio = $bio;
        return $this;
    }

    public function getWebsite(): ?string
    {
        return $this->website;
    }

    public function setWebsite(?string $website): self
    {
        $this->website = $website;
        return $this;
    }

    public function getPortfolioLink(): ?string
    {
        return $this->portfolioLink;
    }

    public function setPortfolioLink(?string $portfolioLink): self
    {
        $this->portfolioLink = $portfolioLink;
        return $this;
    }

    public function getProfessionalHeadline(): ?string
    {
        return $this->professionalHeadline;
    }

    public function setProfessionalHeadline(?string $professionalHeadline): self
    {
        $this->professionalHeadline = $professionalHeadline !== null ? trim($professionalHeadline) : null;

        return $this;
    }

    public function getResumeHighlights(): ?string
    {
        return $this->resumeHighlights;
    }

    public function setResumeHighlights(?string $resumeHighlights): self
    {
        $this->resumeHighlights = $resumeHighlights !== null ? trim($resumeHighlights) : null;

        return $this;
    }

    public function getResumeOriginalName(): ?string
    {
        return $this->resumeOriginalName;
    }

    public function getResumeStoragePath(): ?string
    {
        return $this->resumeStoragePath;
    }

    public function getResumeMimeType(): ?string
    {
        return $this->resumeMimeType;
    }

    public function getResumeUploadedAt(): ?\DateTimeImmutable
    {
        return $this->resumeUploadedAt;
    }

    public function replaceResume(string $originalName, string $storagePath, string $mimeType): self
    {
        $this->resumeOriginalName = trim($originalName);
        $this->resumeStoragePath = trim($storagePath);
        $this->resumeMimeType = trim($mimeType);
        $this->resumeUploadedAt = new \DateTimeImmutable();
        $this->interviewAttemptHistory = null;
        $this->resetVerificationProgress();
        $this->verificationStatus = self::VERIFICATION_RESUME_UPLOADED;

        return $this;
    }

    public function clearResume(): self
    {
        $this->resumeOriginalName = null;
        $this->resumeStoragePath = null;
        $this->resumeMimeType = null;
        $this->resumeUploadedAt = null;
        $this->interviewAttemptHistory = null;
        $this->resetVerificationProgress();

        return $this;
    }

    public function getVerificationStatus(): string
    {
        return $this->verificationStatus;
    }

    public function setVerificationStatus(string $verificationStatus): self
    {
        $this->verificationStatus = trim($verificationStatus);

        return $this;
    }

    public function isVerificationBadgeGranted(): bool
    {
        return $this->verificationBadgeGranted;
    }

    public function getVerificationBadgeGrantedAt(): ?\DateTimeImmutable
    {
        return $this->verificationBadgeGrantedAt;
    }

    /**
     * @return array<int, array<string, mixed>>|null
     */
    public function getInterviewQuestions(): ?array
    {
        return $this->interviewQuestions;
    }

    /**
     * @param array<int, array<string, mixed>>|null $interviewQuestions
     */
    public function setInterviewQuestions(?array $interviewQuestions): self
    {
        $this->interviewQuestions = $interviewQuestions;

        return $this;
    }

    /**
     * @return array<int, array<string, mixed>>|null
     */
    public function getInterviewAnswers(): ?array
    {
        return $this->interviewAnswers;
    }

    /**
     * @param array<int, array<string, mixed>>|null $interviewAnswers
     */
    public function setInterviewAnswers(?array $interviewAnswers): self
    {
        $this->interviewAnswers = $interviewAnswers;

        return $this;
    }

    public function getInterviewScore(): ?int
    {
        return $this->interviewScore;
    }

    /**
     * @return array<int, array<string, mixed>>|null
     */
    public function getInterviewAttemptHistory(): ?array
    {
        return $this->interviewAttemptHistory;
    }

    /**
     * @param array<int, array<string, mixed>>|null $interviewAttemptHistory
     */
    public function setInterviewAttemptHistory(?array $interviewAttemptHistory): self
    {
        $this->interviewAttemptHistory = $interviewAttemptHistory;

        return $this;
    }

    public function setInterviewScore(?int $interviewScore): self
    {
        $this->interviewScore = $interviewScore;

        return $this;
    }

    public function getInterviewSubmittedAt(): ?\DateTimeImmutable
    {
        return $this->interviewSubmittedAt;
    }

    public function setInterviewSubmittedAt(?\DateTimeImmutable $interviewSubmittedAt): self
    {
        $this->interviewSubmittedAt = $interviewSubmittedAt;

        return $this;
    }

    public function getVerificationReviewNote(): ?string
    {
        return $this->verificationReviewNote;
    }

    public function setVerificationReviewNote(?string $verificationReviewNote): self
    {
        $this->verificationReviewNote = $verificationReviewNote !== null ? trim($verificationReviewNote) : null;

        return $this;
    }

    public function markInterviewReady(array $questions): self
    {
        $this->interviewQuestions = $questions;
        $this->interviewAnswers = null;
        $this->interviewScore = null;
        $this->interviewSubmittedAt = null;
        $this->verificationReviewNote = null;
        $this->verificationBadgeGranted = false;
        $this->verificationBadgeGrantedAt = null;
        $this->verificationStatus = self::VERIFICATION_INTERVIEW_READY;

        return $this;
    }

    public function applyInterviewResult(array $answers, int $score, bool $passed, ?string $note = null): self
    {
        $submittedAt = new \DateTimeImmutable();
        $this->interviewAnswers = $answers;
        $this->interviewScore = $score;
        $this->interviewSubmittedAt = $submittedAt;
        $this->verificationReviewNote = $note;
        $this->verificationBadgeGranted = $passed;
        $this->verificationBadgeGrantedAt = $passed ? $submittedAt : null;
        $this->verificationStatus = $passed ? self::VERIFICATION_VERIFIED : self::VERIFICATION_NEEDS_REVISION;
        $this->appendInterviewAttempt([
            'submitted_at' => $submittedAt->format('Y-m-d H:i:s'),
            'score' => $score,
            'passed' => $passed,
            'note' => $note,
            'badge_granted' => $passed,
        ]);

        return $this;
    }

    public function approveVerificationBadge(?string $note = null): self
    {
        $this->verificationBadgeGranted = true;
        $this->verificationBadgeGrantedAt = new \DateTimeImmutable();
        $this->verificationReviewNote = $note;
        $this->verificationStatus = self::VERIFICATION_VERIFIED;

        return $this;
    }

    public function revokeVerificationBadge(?string $note = null): self
    {
        $this->verificationBadgeGranted = false;
        $this->verificationBadgeGrantedAt = null;
        $this->verificationReviewNote = $note;
        $this->verificationStatus = self::VERIFICATION_NEEDS_REVISION;

        return $this;
    }

    public function resetVerificationProgress(): self
    {
        $this->interviewQuestions = null;
        $this->interviewAnswers = null;
        $this->interviewScore = null;
        $this->interviewSubmittedAt = null;
        $this->verificationBadgeGranted = false;
        $this->verificationBadgeGrantedAt = null;
        $this->verificationReviewNote = null;
        $this->verificationStatus = $this->resumeStoragePath !== null
            ? self::VERIFICATION_RESUME_UPLOADED
            : self::VERIFICATION_NOT_STARTED;

        return $this;
    }

    /**
     * @param array<string, mixed> $attempt
     */
    private function appendInterviewAttempt(array $attempt): void
    {
        $history = $this->interviewAttemptHistory ?? [];
        array_unshift($history, $attempt);
        $this->interviewAttemptHistory = array_slice($history, 0, 5);
    }
}
