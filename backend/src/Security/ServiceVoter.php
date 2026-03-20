<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\Service;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, Service>
 */
final class ServiceVoter extends Voter
{
    public const UPDATE = 'SERVICE_UPDATE';
    public const DELETE = 'SERVICE_DELETE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        if (!in_array($attribute, [self::UPDATE, self::DELETE], true)) {
            return false;
        }

        return $subject instanceof Service;
    }

    protected function voteOnAttribute(
        string $attribute,
        mixed $subject,
        TokenInterface $token,
        ?Vote $vote = null
    ): bool {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        /** @var Service $service */
        $service = $subject;

        if ($this->isAdmin($user)) {
            return true;
        }

        if (!in_array('ROLE_VENDOR', $user->getRoles(), true)) {
            return false;
        }

        return match ($attribute) {
            self::UPDATE, self::DELETE => $service->getVendor()->getUser()->getId() === $user->getId(),
            default => false,
        };
    }

    private function isAdmin(User $user): bool
    {
        $roles = $user->getRoles();

        return in_array('ROLE_ADMIN', $roles, true)
            || in_array('ROLE_SUPER_ADMIN', $roles, true);
    }
}
