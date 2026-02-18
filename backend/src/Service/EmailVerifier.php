<?php

namespace App\Service;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\HttpFoundation\RequestStack;

final class EmailVerifier
{
    private const TOKEN_TTL = 3600; // 1 hour

    public function __construct(
        private EntityManagerInterface $em,
        private MailerInterface $mailer,
        private UrlGeneratorInterface $urlGenerator,
        private RequestStack $requestStack
    ) {}

    /**
     * Generate secure verification token and send email
     */
    public function sendVerificationEmail(User $user): void
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

        $email = (new Email())
            ->to($user->getEmail())
            ->subject('Verify Your Email Address')
            ->html("
                <h2>Email Verification</h2>
                <p>Please click the link below to verify your email:</p>
                <p><a href=\"{$verificationUrl}\">Verify Email</a></p>
                <p>This link will expire in 1 hour.</p>
            ");

        $this->mailer->send($email);
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
