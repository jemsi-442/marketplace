<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'escrow_risk_profile')]
#[ORM\UniqueConstraint(name: 'uniq_escrow_risk_escrow', columns: ['escrow_id'])]
class EscrowRiskProfile
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: Escrow::class)]
    #[ORM\JoinColumn(name: 'escrow_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Escrow $escrow;

    #[ORM\Column(type: 'float')]
    private float $clientRiskScore = 0.0;

    #[ORM\Column(type: 'float')]
    private float $vendorRiskScore = 0.0;

    #[ORM\Column(type: 'float')]
    private float $amountRiskFactor = 0.0;

    #[ORM\Column(type: 'float')]
    private float $geoRiskFactor = 0.0;

    #[ORM\Column(type: 'boolean')]
    private bool $anomalyFlag = false;

    #[ORM\Column(type: 'float')]
    private float $finalRiskScore = 0.0;

    #[ORM\Column(type: 'boolean')]
    private bool $manualReviewRequired = false;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $factorsSnapshot = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct(Escrow $escrow)
    {
        $this->escrow = $escrow;
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    public function getFinalRiskScore(): float
    {
        return $this->finalRiskScore;
    }

    public function isManualReviewRequired(): bool
    {
        return $this->manualReviewRequired;
    }

    public function applyScores(
        float $clientRiskScore,
        float $vendorRiskScore,
        float $amountRiskFactor,
        float $geoRiskFactor,
        bool $anomalyFlag,
        float $finalRiskScore,
        bool $manualReviewRequired,
        array $factorsSnapshot = []
    ): void {
        $this->clientRiskScore = round(max(0.0, min(100.0, $clientRiskScore)), 2);
        $this->vendorRiskScore = round(max(0.0, min(100.0, $vendorRiskScore)), 2);
        $this->amountRiskFactor = round(max(0.0, min(100.0, $amountRiskFactor)), 2);
        $this->geoRiskFactor = round(max(0.0, min(100.0, $geoRiskFactor)), 2);
        $this->anomalyFlag = $anomalyFlag;
        $this->finalRiskScore = round(max(0.0, min(100.0, $finalRiskScore)), 2);
        $this->manualReviewRequired = $manualReviewRequired;
        $this->factorsSnapshot = $factorsSnapshot;
        $this->updatedAt = new \DateTimeImmutable();
    }
}
