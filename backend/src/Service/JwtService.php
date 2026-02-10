<?php

namespace App\Service;

use App\Entity\User;
use App\Entity\RefreshToken;
use Doctrine\ORM\EntityManagerInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use DateTimeImmutable;

class JwtService
{
    private string $privateKey;
    private string $publicKey;
    private int $accessTtl;
    private int $refreshTtl;

    public function __construct(
        private EntityManagerInterface $em,
        string $privateKeyPath,
        string $publicKeyPath,
        int $accessTtl = 900,
        int $refreshTtl = 604800
    ) {
        $this->privateKey = file_get_contents($privateKeyPath);
        $this->publicKey  = file_get_contents($publicKeyPath);
        $this->accessTtl  = $accessTtl;
        $this->refreshTtl = $refreshTtl;
    }

    public function generateTokens(
        User $user,
        ?string $deviceName = null,
        ?string $ip = null,
        ?string $userAgent = null
    ): array {
        $now = new DateTimeImmutable();

        $accessPayload = [
            'sub'   => $user->getId(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'type'  => 'access',
            'iat'   => $now->getTimestamp(),
            'exp'   => $now->modify("+{$this->accessTtl} seconds")->getTimestamp(),
        ];

        $accessToken = JWT::encode($accessPayload, $this->privateKey, 'RS256');

        $refreshPayload = [
            'sub'  => $user->getId(),
            'jti'  => bin2hex(random_bytes(32)),
            'type' => 'refresh',
            'iat'  => $now->getTimestamp(),
            'exp'  => $now->modify("+{$this->refreshTtl} seconds")->getTimestamp(),
        ];

        $refreshToken = JWT::encode($refreshPayload, $this->privateKey, 'RS256');

        $entity = new RefreshToken();
        $entity->setUser($user)
            ->setTokenHash(hash('sha256', $refreshToken))
            ->setDeviceName($deviceName)
            ->setIpAddress($ip)
            ->setUserAgent($userAgent)
            ->setExpiresAt($now->modify("+{$this->refreshTtl} seconds"));

        $this->em->persist($entity);
        $this->em->flush();

        return [
            'access_token'  => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in'    => $this->accessTtl,
        ];
    }

    public function refresh(string $refreshToken): ?array
    {
        $payload = $this->validate($refreshToken);
        if (!$payload || ($payload['type'] ?? null) !== 'refresh') {
            return null;
        }

        $hash = hash('sha256', $refreshToken);

        $tokenEntity = $this->em
            ->getRepository(RefreshToken::class)
            ->findOneBy(['tokenHash' => $hash]);

        if (!$tokenEntity || $tokenEntity->isExpired() || $tokenEntity->isRevoked()) {
            return null;
        }

        $user = $tokenEntity->getUser();

        // Rotation
        $tokenEntity->revoke();
        $this->em->flush();

        return $this->generateTokens($user);
    }

    public function validate(string $token): ?array
    {
        try {
            return (array) JWT::decode(
                $token,
                new Key($this->publicKey, 'RS256')
            );
        } catch (\Exception) {
            return null;
        }
    }

    public function revokeAll(User $user): void
    {
        $tokens = $this->em
            ->getRepository(RefreshToken::class)
            ->findBy(['user' => $user]);

        foreach ($tokens as $token) {
            $token->revoke();
        }

        $this->em->flush();
    }
}
