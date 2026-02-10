<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'refresh_tokens')]
#[ORM\Index(columns: ['token_hash'], name: 'idx_token_hash')]
class RefreshToken
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: 'string', length: 128)]
    private string $tokenHash;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $deviceName = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $ipAddress = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $userAgent = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $revokedAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function isExpired(): bool
    {
        return $this->expiresAt < new \DateTimeImmutable();
    }

    public function isRevoked(): bool
    {
        return $this->revokedAt !== null;
    }

    /* =========================
       Getters & Setters
    ========================= */

    public function setUser(User $user): self { $this->user = $user; return $this; }
    public function getUser(): User { return $this->user; }

    public function setTokenHash(string $hash): self { $this->tokenHash = $hash; return $this; }
    public function getTokenHash(): string { return $this->tokenHash; }

    public function setDeviceName(?string $device): self { $this->deviceName = $device; return $this; }
    public function setIpAddress(?string $ip): self { $this->ipAddress = $ip; return $this; }
    public function setUserAgent(?string $ua): self { $this->userAgent = $ua; return $this; }

    public function setExpiresAt(\DateTimeImmutable $date): self { $this->expiresAt = $date; return $this; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }

    public function revoke(): void { $this->revokedAt = new \DateTimeImmutable(); }
}
