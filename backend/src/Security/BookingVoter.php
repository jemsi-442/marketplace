<?php

namespace App\Security;

use App\Entity\Booking;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

final class BookingVoter extends Voter
{
    // Define actions
    private const VIEW = 'BOOKING_VIEW';
    private const CANCEL = 'BOOKING_CANCEL';

    protected function supports(string $attribute, $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::CANCEL], true)
            && $subject instanceof Booking;
    }

    /**
     * @param string $attribute
     * @param Booking $subject
     * @param TokenInterface $token
     */
    protected function voteOnAttribute(string $attribute, $subject, TokenInterface $token): bool
    {
        /** @var User|null $user */
        $user = $token->getUser();

        if (!$user instanceof User) {
            // Not logged in
            return false;
        }

        // Admin bypass
        if (in_array('ROLE_ADMIN', $user->getRoles(), true) || in_array('ROLE_SUPER_ADMIN', $user->getRoles(), true)) {
            return true;
        }

        switch ($attribute) {
            case self::VIEW:
            case self::CANCEL:
                return $subject->getUser()->getId() === $user->getId();
        }

        return false;
    }
}
