<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'fraud_risk')]
#[ORM\Index(name: 'idx_fraud_risk_user_created', columns: ['user_id', 'created_at'])]
#[ORM\Index(name: 'idx_fraud_risk_level', columns: ['risk_level'])]
class FraudRisk
{
    public const LEVEL_LOW = 'LOW';
    public const LEVEL_MEDIUM = 'MEDIUM';
    public const LEVEL_HIGH = 'HIGH';
    public const LEVEL_CRITICAL = 'CRITICAL';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: 'smallint')]
    private int $score;

    #[ORM\Column(name: 'risk_level', type: 'string', length: 20)]
    private string $riskLevel;

    #[ORM\Column(type: 'string', length: 255)]
    private string $reason;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $metadata = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(User $user, int $score, string $reason, ?array $metadata = null)
    {
        $this->user = $user;
        $this->score = max(0, min(100, $score));
        $this->riskLevel = self::resolveRiskLevel($this->score);
        $this->reason = substr(trim($reason), 0, 255);
        $this->metadata = $metadata;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getScore(): int
    {
        return $this->score;
    }

    public function getRiskLevel(): string
    {
        return $this->riskLevel;
    }

    public function getReason(): string
    {
        return $this->reason;
    }

    public function getMetadata(): ?array
    {
        return $this->metadata;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public static function resolveRiskLevel(int $score): string
    {
        return match (true) {
            $score >= 80 => self::LEVEL_CRITICAL,
            $score >= 60 => self::LEVEL_HIGH,
            $score >= 35 => self::LEVEL_MEDIUM,
            default => self::LEVEL_LOW,
        };
    }
}
