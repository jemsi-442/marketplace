<?php

namespace App\Service;

final class PasswordPolicy
{
    public static function validate(string $password): void
    {
        if (strlen($password) < 8) {
            throw new \DomainException('Password too short');
        }

        if (!preg_match('/[A-Z]/', $password)) {
            throw new \DomainException('Password must contain uppercase letter');
        }

        if (!preg_match('/[0-9]/', $password)) {
            throw new \DomainException('Password must contain number');
        }
    }
}
