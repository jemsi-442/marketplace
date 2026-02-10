<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class FraudRisk
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private int $score;

    #[ORM\Column(length: 50)]
    private string $reason;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    #[ORM\ManyToOne(targetEntity: User::class)]
    private User $user;

    public function __construct(User $user, int $score, string $reason)
    {
        $this->user = $user;
        $this->score = $score;
        $this->reason = $reason;
        $this->createdAt = new \DateTimeImmutable();
    }

    // getters...
}
