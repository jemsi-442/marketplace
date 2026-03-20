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
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\Column(type: 'bigint', nullable: true)]
    private ?int $avgTransactionAmountMinor = 0;

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

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(User $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function getAvgTransactionAmountMinor(): int
    {
        return $this->avgTransactionAmountMinor ?? 0;
    }

    public function setAvgTransactionAmountMinor(?int $avgTransactionAmountMinor): self
    {
        if ($avgTransactionAmountMinor !== null && $avgTransactionAmountMinor < 0) {
            throw new \InvalidArgumentException('Average transaction amount minor must be zero or positive.');
        }

        $this->avgTransactionAmountMinor = $avgTransactionAmountMinor;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    /**
     * Temporary compatibility wrapper for legacy callers using major units.
     */
    public function getAvgTransactionAmount(): float
    {
        return $this->getAvgTransactionAmountMinor() / 100;
    }

    /**
     * Temporary compatibility wrapper for legacy callers using major units.
     */
    public function setAvgTransactionAmount(?float $avgTransactionAmount): self
    {
        if ($avgTransactionAmount === null) {
            return $this->setAvgTransactionAmountMinor(null);
        }

        return $this->setAvgTransactionAmountMinor((int) round($avgTransactionAmount * 100));
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
