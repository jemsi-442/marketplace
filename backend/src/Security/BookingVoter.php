<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\Booking;
use App\Entity\Escrow;
use App\Entity\User;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * @extends Voter<string, Booking>
 */
final class BookingVoter extends Voter
{
    public const VIEW = 'BOOKING_VIEW';
    public const UPDATE = 'BOOKING_UPDATE';
    public const DELETE = 'BOOKING_DELETE';
    public const REVIEW = 'BOOKING_REVIEW';

    protected function supports(string $attribute, mixed $subject): bool
    {
        if (!in_array($attribute, [self::VIEW, self::UPDATE, self::DELETE, self::REVIEW], true)) {
            return false;
        }

        return $subject instanceof Booking;
    }

    protected function voteOnAttribute(
        string $attribute,
        mixed $subject,
        TokenInterface $token,
        ?Vote $vote = null
    ): bool {
        /** @var User|null $user */
        $user = $token->getUser();

        if (!$user instanceof User) {
            return false;
        }

        /** @var Booking $booking */
        $booking = $subject;

        // 🔥 ADMIN OVERRIDE
        if ($this->isAdmin($user)) {
            return true;
        }

        // 🔒 Booking must exist with valid ID
        if (!$booking->getId()) {
            return false;
        }

        return match ($attribute) {
            self::VIEW => $this->canView($booking, $user),
            self::UPDATE => $this->canUpdate($booking, $user),
            self::DELETE => $this->canDelete($booking, $user),
            self::REVIEW => $this->canReview($booking, $user),
            default => false,
        };
    }

    private function isAdmin(User $user): bool
    {
        $roles = $user->getRoles();

        return in_array('ROLE_ADMIN', $roles, true)
            || in_array('ROLE_SUPER_ADMIN', $roles, true);
    }

    private function canView(Booking $booking, User $user): bool
    {
        // Client can view own booking
        if ($booking->getClient()->getId() === $user->getId()) {
            return true;
        }

        // Vendor can view booking assigned to their service
        if ($booking->getService()->getVendor()->getUser()->getId() === $user->getId()) {
            return true;
        }

        return false;
    }

    private function canUpdate(Booking $booking, User $user): bool
    {
        return $this->canView($booking, $user);
    }

    private function canDelete(Booking $booking, User $user): bool
    {
        if ($booking->getClient()->getId() !== $user->getId()) {
            return false;
        }

        if (in_array($booking->getStatus(), [Booking::STATUS_COMPLETED, Booking::STATUS_CANCELLED], true)) {
            return false;
        }

        if ($booking->getEscrow()?->getStatus() === Escrow::STATUS_RELEASED) {
            return false;
        }

        return true;
    }

    private function canReview(Booking $booking, User $user): bool
    {
        if ($booking->getClient()->getId() !== $user->getId()) {
            return false;
        }

        if ($booking->getStatus() !== Booking::STATUS_COMPLETED) {
            return false;
        }

        $vendorId = $booking->getService()->getVendor()->getUser()->getId();

        return $vendorId !== $user->getId();
    }
}
