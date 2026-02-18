<?php

namespace App\Security;

use App\Entity\Booking;
use App\Entity\User;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

final class BookingVoter extends Voter
{
    public const VIEW = 'BOOKING_VIEW';
    public const CANCEL = 'BOOKING_CANCEL';

    protected function supports(string $attribute, mixed $subject): bool
    {
        if (!in_array($attribute, [self::VIEW, self::CANCEL], true)) {
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
            self::VIEW   => $this->canView($booking, $user),
            self::CANCEL => $this->canCancel($booking, $user),
            default      => false,
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
        if ($booking->getUser()?->getId() === $user->getId()) {
            return true;
        }

        // Vendor can view booking assigned to their service
        if ($booking->getService()?->getVendor()?->getUser()?->getId() === $user->getId()) {
            return true;
        }

        return false;
    }

    private function canCancel(Booking $booking, User $user): bool
    {
        // Only client can cancel
        if ($booking->getUser()?->getId() !== $user->getId()) {
            return false;
        }

        // Cannot cancel completed or cancelled bookings
        if (in_array($booking->getStatus(), ['completed', 'cancelled'], true)) {
            return false;
        }

        // Cannot cancel if escrow already released
        if ($booking->getEscrow()?->getStatus() === 'released') {
            return false;
        }

        return true;
    }
}
