<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Table(name: 'user')]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    /* =========================
       PRIMARY KEY
    ========================= */
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    /* =========================
       AUTH CORE
    ========================= */
    #[ORM\Column(type: 'string', length: 180, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Email]
    private string $email;

    #[ORM\Column(type: 'json')]
    private array $roles = [];

    #[ORM\Column(type: 'string')]
    #[Assert\NotBlank]
    #[Assert\Length(min: 8)]
    private string $password;

    /* =========================
       SECURITY FLAGS
    ========================= */
    #[ORM\Column(type: 'boolean')]
    private bool $isVerified = false;

    #[ORM\Column(type: 'boolean')]
    private bool $isLocked = false;

    #[ORM\Column(type: 'integer')]
    private int $failedLoginAttempts = 0;

    #[ORM\Column(type: 'string', length: 64, nullable: true)]
    private ?string $verificationToken = null;

    #[ORM\Column(type: 'string', length: 128, nullable: true)]
    private ?string $refreshToken = null;

    /* =========================
       TRUST & RISK ENGINE
    ========================= */
    #[ORM\Column(type: 'float')]
    private float $trustScore = 100.0;

    #[ORM\Column(type: 'string', length: 20)]
    private string $riskLevel = 'LOW';

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $lastRiskUpdate = null;

    /* =========================
       TIMESTAMPS
    ========================= */
    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $updatedAt;

    /* =========================
       VENDOR PROFILE RELATION
    ========================= */
    #[ORM\OneToOne(mappedBy: 'user', targetEntity: VendorProfile::class, cascade: ['persist', 'remove'])]
    private ?VendorProfile $vendorProfile = null;

    /* =========================
       CONSTRUCTOR
    ========================= */
    public function __construct()
    {
        $this->roles = ['ROLE_CLIENT'];
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->trustScore = 100.0;
        $this->riskLevel = 'LOW';
    }

    /* =========================
       BASIC GETTERS / SETTERS
    ========================= */
    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = strtolower(trim($email));
        return $this;
    }

    public function getRoles(): array
    {
        $roles = $this->roles;
        if (!in_array('ROLE_CLIENT', $roles)) {
            $roles[] = 'ROLE_CLIENT';
        }
        return array_unique($roles);
    }

    public function setRoles(array $roles): self
    {
        $this->roles = array_unique($roles);
        return $this;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;
        return $this;
    }

    /* =========================
       SECURITY METHODS
    ========================= */
    public function isVerified(): bool
    {
        return $this->isVerified;
    }

    public function setIsVerified(bool $verified): self
    {
        $this->isVerified = $verified;
        return $this;
    }

    public function isLocked(): bool
    {
        return $this->isLocked;
    }

    public function setIsLocked(bool $locked): self
    {
        $this->isLocked = $locked;
        return $this;
    }

    public function incrementFailedLoginAttempts(): self
    {
        $this->failedLoginAttempts++;
        return $this;
    }

    public function resetFailedLoginAttempts(): self
    {
        $this->failedLoginAttempts = 0;
        return $this;
    }

    public function getFailedLoginAttempts(): int
    {
        return $this->failedLoginAttempts;
    }

    public function setVerificationToken(?string $token): self
    {
        $this->verificationToken = $token;
        return $this;
    }

    public function getVerificationToken(): ?string
    {
        return $this->verificationToken;
    }

    public function setRefreshToken(?string $token): self
    {
        $this->refreshToken = $token;
        return $this;
    }

    public function getRefreshToken(): ?string
    {
        return $this->refreshToken;
    }

    /* =========================
       TRUST ENGINE
    ========================= */
    public function getTrustScore(): float
    {
        return $this->trustScore;
    }

    public function setTrustScore(float $score): self
    {
        $score = max(0, min(100, $score));
        $this->trustScore = round($score, 2);
        $this->updateRiskLevel();
        $this->lastRiskUpdate = new \DateTimeImmutable();
        return $this;
    }

    public function getRiskLevel(): string
    {
        return $this->riskLevel;
    }

    public function getLastRiskUpdate(): ?\DateTimeInterface
    {
        return $this->lastRiskUpdate;
    }

    private function updateRiskLevel(): void
    {
        if ($this->trustScore >= 80) {
            $this->riskLevel = 'LOW';
        } elseif ($this->trustScore >= 60) {
            $this->riskLevel = 'MEDIUM';
        } elseif ($this->trustScore >= 40) {
            $this->riskLevel = 'HIGH';
        } else {
            $this->riskLevel = 'CRITICAL';
        }
    }

    /* =========================
       TIMESTAMPS
    ========================= */
    public function getCreatedAt(): \DateTimeInterface
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeInterface
    {
        return $this->updatedAt;
    }

    #[ORM\PreUpdate]
    public function preUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    /* =========================
       VENDOR PROFILE GETTER/SETTER
    ========================= */
    public function getVendorProfile(): ?VendorProfile
    {
        return $this->vendorProfile;
    }

    public function setVendorProfile(?VendorProfile $vendorProfile): self
    {
        $this->vendorProfile = $vendorProfile;

        if ($vendorProfile && $vendorProfile->getUser() !== $this) {
            $vendorProfile->setUser($this);
        }

        return $this;
    }

    /* =========================
       SECURITY INTERFACE
    ========================= */
    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    public function eraseCredentials(): void
    {
        // No temporary sensitive fields stored
    }
}
