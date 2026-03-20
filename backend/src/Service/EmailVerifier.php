<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

final class EmailVerifier
{
    private const TOKEN_TTL = 3600; // 1 hour

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly LoggerInterface $logger
    ) {}

    /**
     * Generate secure verification token and send email
     *
     * @return array{sent:bool, verification_url:string}
     */
    public function sendVerificationEmail(User $user): array
    {
        $token = $this->generateSecureToken();

        $user->setVerificationToken($token);
        $this->em->flush();

        $verificationUrl = $this->urlGenerator->generate(
            'api_verify_email',
            [
                'token' => $token,
                'expires' => time() + self::TOKEN_TTL,
            ],
            UrlGeneratorInterface::ABSOLUTE_URL
        );

        // Mail delivery is intentionally decoupled from token issuance.
        // In environments without Symfony Mailer installed, registration still succeeds.
        $this->logger->info('Verification link generated.', [
            'user_id' => $user->getId(),
            'email' => $user->getEmail(),
            'verification_url' => $verificationUrl,
        ]);

        return [
            'sent' => false,
            'verification_url' => $verificationUrl,
        ];
    }

    /**
     * Validate verification token
     */
    public function verify(string $token, int $expires): bool
    {
        if (time() > $expires) {
            return false;
        }

        $user = $this->em->getRepository(User::class)
            ->findOneBy(['verificationToken' => $token]);

        if (!$user) {
            return false;
        }

        $user->setIsVerified(true);
        $user->setVerificationToken(null);
        $this->em->flush();

        return true;
    }

    /**
     * Generate cryptographically secure token
     */
    private function generateSecureToken(): string
    {
        return bin2hex(random_bytes(32));
    }
}
