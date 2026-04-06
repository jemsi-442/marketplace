<?php

declare(strict_types=1);

namespace App\Exception\Domain;

final class SocialRoleSelectionRequiredException extends \DomainException
{
    public function __construct(
        private readonly string $provider,
        private readonly string $email,
    ) {
        parent::__construct('Role selection is required before creating a social-auth account.');
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function getEmail(): string
    {
        return $this->email;
    }
}
