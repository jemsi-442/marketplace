<?php

declare(strict_types=1);

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
    private ?float $avgTransactionAmount = 0.0;

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

    public function getAvgTransactionAmount(): float
    {
        return $this->avgTransactionAmount ?? 0.0;
    }

    public function setAvgTransactionAmount(?float $avgTransactionAmount): self
    {
        $this->avgTransactionAmount = $avgTransactionAmount;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getAvgDailyTransactions(): int
    {
        return $this->avgDailyTransactions ?? 0;
    }

    public function setAvgDailyTransactions(?int $avgDailyTransactions): self
    {
        $this->avgDailyTransactions = $avgDailyTransactions;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getUsualLoginCountry(): ?string
    {
        return $this->usualLoginCountry;
    }

    public function setUsualLoginCountry(?string $usualLoginCountry): self
    {
        $this->usualLoginCountry = $usualLoginCountry;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getUsualLoginHour(): ?int
    {
        return $this->usualLoginHour;
    }

    public function setUsualLoginHour(?int $usualLoginHour): self
    {
        $this->usualLoginHour = $usualLoginHour;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getUpdatedAt(): \DateTimeInterface
    {
        return $this->updatedAt;
    }
}
