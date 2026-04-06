<?php

declare(strict_types=1);

namespace App\Controller\Api\Auth;

use App\Service\EmailVerifier;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class VerifyEmailController extends AbstractController
{
    #[Route('/api/auth/verify-email', name: 'api_verify_email', methods: ['GET'])]
    public function __invoke(Request $request, EmailVerifier $emailVerifier): JsonResponse
    {
        $token = trim((string) $request->query->get('token', ''));
        $expires = (int) $request->query->get('expires', 0);
        $signature = trim((string) $request->query->get('signature', ''));

        if ($token === '' || $expires <= 0 || $signature === '') {
            return $this->json(['error' => 'token, expires, and signature are required'], 400);
        }

        if (!$emailVerifier->verify($token, $expires, $signature)) {
            return $this->json(['error' => 'Verification link is invalid or expired'], 400);
        }

        return $this->json([
            'message' => 'Email verified successfully',
            'verified' => true,
        ]);
    }
}
