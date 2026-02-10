<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class UserBehaviorProfile
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: User::class)]
    private User $user;

    #[ORM\Column(nullable: true)]
    private ?float $avgTransactionAmount = 0;

    #[ORM\Column(nullable: true)]
    private ?int $avgDailyTransactions = 0;

    #[ORM\Column(nullable: true)]
    private ?string $usualLoginCountry = null;

    #[ORM\Column(nullable: true)]
    private ?int $usualLoginHour = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $this->updatedAt = new \DateTime();
    }

    // getters & setters ...
}
