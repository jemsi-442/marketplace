<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class AuthService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
        private readonly JwtService $jwt,
        private readonly EmailVerifier $emailVerifier
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function register(string $email, string $password, string $role): array
    {
        if ($this->users->findOneBy(['email' => $email])) {
            throw new \DomainException('Email already exists');
        }

        $user = new User();
        $user->setEmail($email);
        $user->setRoles([$role]);

        $user->setPassword(
            $this->hasher->hashPassword($user, $password)
        );

        $this->em->persist($user);
        $this->em->flush();

        $verification = $this->emailVerifier->sendVerificationEmail($user);

        return $this->issueToken($user, [
            'verification_required' => true,
            'verification_email_sent' => $verification['sent'],
            'verification_url' => $verification['verification_url'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function login(User $user): array
    {
        return $this->issueToken($user);
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function issueToken(User $user, array $extra = []): array
    {
        $tokens = $this->jwt->generateTokens($user);

        return array_merge([
            'token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'expires_in' => $tokens['expires_in'],
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
                'is_verified' => $user->isVerified(),
            ]
        ], $extra);
    }
}
