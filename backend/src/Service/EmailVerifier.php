<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

final class EmailVerifier
{
    private const TOKEN_TTL = 3600; // 1 hour

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly LoggerInterface $logger,
        #[Autowire('%kernel.environment%')]
        private readonly string $environment,
        #[Autowire('%kernel.secret%')]
        private readonly string $appSecret,
        #[Autowire('%kernel.debug%')]
        private readonly bool $debug,
    ) {}

    /**
     * Generate secure verification token and send email
     *
     * @return array{sent:bool, verification_url?:string}
     */
    public function sendVerificationEmail(User $user): array
    {
        $token = $this->generateSecureToken();
        $expires = time() + self::TOKEN_TTL;
        $signature = $this->generateSignature($token, $expires);

        $user->setVerificationToken($token);
        $this->em->flush();

        $verificationUrl = $this->urlGenerator->generate(
            'api_verify_email',
            [
                'token' => $token,
                'expires' => $expires,
                'signature' => $signature,
            ],
            UrlGeneratorInterface::ABSOLUTE_URL
        );

        $this->logger->info('Verification link generated.', [
            'user_id' => $user->getId(),
            'email' => $user->getEmail(),
            'verification_url_available' => $this->shouldExposeVerificationUrl(),
        ]);

        $payload = [
            'sent' => false,
        ];

        if ($this->shouldExposeVerificationUrl()) {
            $payload['verification_url'] = $verificationUrl;
        }

        return $payload;
    }

    /**
     * Validate verification token
     */
    public function verify(string $token, int $expires, string $signature): bool
    {
        if (time() > $expires) {
            return false;
        }

        $expectedSignature = $this->generateSignature($token, $expires);
        if (!hash_equals($expectedSignature, $signature)) {
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
     * @return array{sent:bool, verification_url?:string}
     */
    public function resendVerificationEmail(string $email): array
    {
        $normalizedEmail = strtolower(trim($email));

        /** @var User|null $user */
        $user = $this->em->getRepository(User::class)
            ->findOneBy(['email' => $normalizedEmail]);

        if (!$user || $user->isVerified()) {
            return ['sent' => false];
        }

        return $this->sendVerificationEmail($user);
    }

    /**
     * Generate cryptographically secure token
     */
    private function generateSecureToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    private function generateSignature(string $token, int $expires): string
    {
        return hash_hmac('sha256', sprintf('%s.%d', $token, $expires), $this->appSecret);
    }

    private function shouldExposeVerificationUrl(): bool
    {
        return $this->debug || in_array($this->environment, ['dev', 'test'], true);
    }
}
