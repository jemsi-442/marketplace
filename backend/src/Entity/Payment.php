<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\PaymentRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: PaymentRepository::class)]
#[ORM\Table(name: 'payment')]
class Payment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Booking::class)]
    #[ORM\JoinColumn(nullable: false)]
    private Booking $booking;

    #[ORM\Column(type: 'bigint')]
    #[Assert\Positive]
    private int $amountMinor = 0;

    #[ORM\Column(type: 'string', length: 50)]
    #[Assert\Choice(['pending', 'completed', 'failed'])]
    private string $status = 'pending';

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getBooking(): Booking
    {
        return $this->booking;
    }

    public function setBooking(Booking $booking): self
    {
        $this->booking = $booking;

        return $this;
    }

    public function getAmountMinor(): int
    {
        return $this->amountMinor;
    }

    public function setAmountMinor(int $amountMinor): self
    {
        if ($amountMinor < 0) {
            throw new \InvalidArgumentException('Payment amount minor must be zero or positive.');
        }

        $this->amountMinor = $amountMinor;

        return $this;
    }

    /**
     * Temporary compatibility wrapper for legacy callers using major units.
     */
    public function getAmount(): float
    {
        return $this->amountMinor / 100;
    }

    /**
     * Temporary compatibility wrapper for legacy callers using major units.
     */
    public function setAmount(float $amount): self
    {
        return $this->setAmountMinor((int) round($amount * 100));
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
