<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Throwable;

final class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public function __construct(
        #[Autowire('%kernel.debug%')]
        private readonly bool $debug = false,
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            'kernel.exception' => 'onKernelException',
        ];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $request = $event->getRequest();

        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $throwable = $event->getThrowable();
        [$statusCode, $message, $error, $debugPayload] = $this->normalizeThrowable($throwable);

        $response = [
            'error' => $error,
            'message' => $message,
        ];

        if ($debugPayload !== []) {
            $response['debug'] = $debugPayload;
        }

        $event->setResponse(new JsonResponse($response, $statusCode));
    }

    /**
     * @return array{0:int, 1:string, 2:string, 3:array<string, mixed>}
     */
    private function normalizeThrowable(Throwable $throwable): array
    {
        if ($throwable instanceof AccessDeniedException) {
            return [403, $throwable->getMessage() ?: 'Access denied', 'access_denied', []];
        }

        if ($throwable instanceof AuthenticationException) {
            return [401, $throwable->getMessage() ?: 'Authentication required', 'authentication_required', []];
        }

        if ($throwable instanceof HttpExceptionInterface) {
            $statusCode = $throwable->getStatusCode();
            $message = $throwable->getMessage() ?: $this->defaultMessageForStatus($statusCode);

            return [$statusCode, $message, $this->errorCodeForStatus($statusCode), []];
        }

        $debugPayload = [];

        if ($this->debug) {
            $debugPayload = [
                'exception' => $throwable::class,
                'detail' => $throwable->getMessage(),
            ];
        }

        return [500, 'Internal server error', 'server_error', $debugPayload];
    }

    private function defaultMessageForStatus(int $statusCode): string
    {
        return match ($statusCode) {
            400 => 'Bad request',
            401 => 'Authentication required',
            403 => 'Access denied',
            404 => 'Resource not found',
            default => 'Request failed',
        };
    }

    private function errorCodeForStatus(int $statusCode): string
    {
        return match ($statusCode) {
            400 => 'bad_request',
            401 => 'authentication_required',
            403 => 'access_denied',
            404 => 'not_found',
            default => 'request_failed',
        };
    }
}
