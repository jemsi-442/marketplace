<?php

declare(strict_types=1);

namespace App\Controller\Api\Auth;

use App\Exception\Domain\SocialRoleSelectionRequiredException;
use App\Http\AuthCookies;
use App\Service\JwtService;
use App\Service\OAuthStateService;
use App\Service\SocialAuthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/auth/oauth')]
final class SocialAuthController extends AbstractController
{
    #[Route('/{provider}/start', methods: ['GET'])]
    public function start(
        string $provider,
        Request $request,
        OAuthStateService $stateService,
        SocialAuthService $socialAuth,
    ): RedirectResponse {
        $intent = $this->normalizeIntent($request->query->get('intent'));
        $role = $this->normalizeRole($request->query->get('role'));
        $next = $request->query->get('next');
        $normalizedProvider = strtolower(trim($provider));

        try {
            $state = $stateService->issue($normalizedProvider, $intent, $role, is_string($next) ? $next : null);
            $authorizationUrl = $socialAuth->buildAuthorizationUrl($normalizedProvider, $state['token']);
        } catch (\DomainException $exception) {
            return new RedirectResponse($socialAuth->failureRedirectUrl($normalizedProvider, 'social-auth-unavailable'));
        }

        $response = new RedirectResponse($authorizationUrl);
        $response->headers->setCookie($stateService->buildCookie($normalizedProvider, $state['token']));

        return $response;
    }

    #[Route('/{provider}/callback', methods: ['GET'])]
    public function callback(
        string $provider,
        Request $request,
        OAuthStateService $stateService,
        SocialAuthService $socialAuth,
        AuthCookies $authCookies,
        JwtService $jwtService,
    ): RedirectResponse {
        $normalizedProvider = strtolower(trim($provider));

        try {
            $state = $stateService->validate($normalizedProvider, $request->query->get('state'), $request);

            if ($request->query->has('error')) {
                throw new \DomainException('OAuth provider denied access.');
            }

            $code = $request->query->get('code');
            if (!is_string($code) || trim($code) === '') {
                throw new \DomainException('OAuth code is missing.');
            }

            $result = $socialAuth->authenticate($normalizedProvider, $code, $state['role']);
            $successPath = $socialAuth->successRedirectPath($state['intent'], $state['role'], $state['next']);
            $response = new RedirectResponse($socialAuth->frontendUrl($successPath));
            $response->headers->setCookie($stateService->buildClearingCookie($normalizedProvider));

            return $authCookies->attachSessionCookies($response, [
                'access_token' => $result['session']['token'],
                'refresh_token' => $result['session']['refresh_token'],
                'expires_in' => $result['session']['expires_in'],
            ], $jwtService->getRefreshTtl());
        } catch (SocialRoleSelectionRequiredException $exception) {
            $response = new RedirectResponse(
                $socialAuth->roleSelectionRedirectUrl($exception->getProvider(), $exception->getEmail())
            );
            $response->headers->setCookie($stateService->buildClearingCookie($normalizedProvider));

            return $response;
        } catch (\Throwable) {
            $response = new RedirectResponse($socialAuth->failureRedirectUrl($normalizedProvider));
            $response->headers->setCookie($stateService->buildClearingCookie($normalizedProvider));

            return $response;
        }
    }

    private function normalizeIntent(mixed $value): string
    {
        return is_string($value) && strtolower(trim($value)) === 'register' ? 'register' : 'login';
    }

    private function normalizeRole(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        return match (strtolower(trim($value))) {
            'client' => 'client',
            'vendor' => 'vendor',
            default => null,
        };
    }
}
