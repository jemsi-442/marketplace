<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use JsonException;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

final class ApiRequestTraceSubscriber implements EventSubscriberInterface
{
    public const ATTRIBUTE = '_api_request_id';
    private const HEADER = 'X-Request-Id';

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => 'onKernelRequest',
            KernelEvents::RESPONSE => 'onKernelResponse',
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $incoming = trim((string) $request->headers->get(self::HEADER, ''));
        $requestId = $this->normalizeRequestId($incoming);

        if ($requestId === null) {
            $requestId = bin2hex(random_bytes(12));
        }

        $request->attributes->set(self::ATTRIBUTE, $requestId);
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $requestId = $request->attributes->get(self::ATTRIBUTE);
        if (!is_string($requestId) || $requestId === '') {
            return;
        }

        $response = $event->getResponse();
        $response->headers->set(self::HEADER, $requestId);

        if ($response->getStatusCode() < 400 || !$response instanceof JsonResponse) {
            return;
        }

        $content = $response->getContent();
        if (!is_string($content) || trim($content) === '') {
            return;
        }

        try {
            $payload = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return;
        }

        if (!is_array($payload) || array_key_exists('request_id', $payload)) {
            return;
        }

        $payload['request_id'] = $requestId;
        $response->setData($payload);
    }

    private function normalizeRequestId(string $value): ?string
    {
        if ($value === '' || strlen($value) > 128) {
            return null;
        }

        if (!preg_match('/^[A-Za-z0-9._-]+$/', $value)) {
            return null;
        }

        return $value;
    }
}
