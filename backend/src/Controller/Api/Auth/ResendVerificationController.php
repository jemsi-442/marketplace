<?php

declare(strict_types=1);

namespace App\Controller\Api\Auth;

use App\Service\EmailVerifier;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\RateLimiter\RateLimiterFactory;

#[Route('/api/auth/resend-verification', methods: ['POST'])]
final class ResendVerificationController extends AbstractController
{
    public function __construct(
        #[Autowire(service: 'limiter.resend_verification')]
        private readonly RateLimiterFactory $resendVerificationLimiter,
    ) {
    }

    public function __invoke(
        Request $request,
        EmailVerifier $emailVerifier
    ): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid payload'], 400);
        }

        $email = $data['email'] ?? null;
        if (!is_string($email) || trim($email) === '') {
            return $this->json(['error' => 'Email is required'], 400);
        }

        $normalizedEmail = strtolower(trim($email));
        $ipAddress = $request->getClientIp() ?? 'unknown';
        $limiter = $this->resendVerificationLimiter->create(sprintf('%s|%s', $normalizedEmail, $ipAddress));
        if (!$limiter->consume()->isAccepted()) {
            return $this->json([
                'error' => 'Too many verification requests. Try again later.',
            ], 429);
        }

        $verification = $emailVerifier->resendVerificationEmail($normalizedEmail);

        return $this->json(array_filter([
            'message' => 'If the account still needs verification, a new verification link has been prepared.',
            'verification_url' => $verification['verification_url'] ?? null,
        ], static fn (mixed $value): bool => $value !== null));
    }
}
