<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'partial_release')]
class PartialRelease
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column(type: 'integer')]
    private int $id;

    #[ORM\ManyToOne(targetEntity: Escrow::class, inversedBy: 'partialReleases')]
    #[ORM\JoinColumn(nullable: false)]
    private Escrow $escrow;

    #[ORM\Column(type: 'string')]
    private string $milestone; // e.g., "Phase 1: UI Complete"

    #[ORM\Column(type: 'float')]
    private float $amount;

    #[ORM\Column(type: 'boolean')]
    private bool $released = false;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    // Getters & Setters...
}
