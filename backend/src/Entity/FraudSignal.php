<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'fraud_signal')]
#[ORM\Index(name: 'idx_fraud_signal_user_created', columns: ['user_id', 'created_at'])]
#[ORM\Index(name: 'idx_fraud_signal_type', columns: ['signal_type'])]
class FraudSignal
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: 'string', length: 60)]
    private string $signalType;

    #[ORM\Column(type: 'smallint')]
    private int $severity;

    #[ORM\Column(type: 'json')]
    private array $metadata;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(User $user, string $signalType, int $severity, array $metadata = [])
    {
        $this->user = $user;
        $this->signalType = strtoupper(trim($signalType));
        $this->severity = max(1, min(100, $severity));
        $this->metadata = $metadata;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getSeverity(): int
    {
        return $this->severity;
    }
}
