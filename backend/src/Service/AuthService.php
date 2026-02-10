<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;

final class AuthService
{
    public function __construct(
        private UserRepository $users,
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
        private JwtService $jwt
    ) {}

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

        return $this->issueToken($user);
    }

    public function login(User $user): array
    {
        return $this->issueToken($user);
    }

    private function issueToken(User $user): array
    {
        return [
            'token' => $this->jwt->generate([
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
            ]),
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
            ]
        ];
    }
}
