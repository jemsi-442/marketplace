<?php

use App\Kernel;

require_once dirname(__DIR__).'/vendor/autoload_runtime.php';

if (PHP_SAPI === 'cli-server') {
    $_SERVER['APP_ENV'] ??= $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: null;
    $_SERVER['APP_DEBUG'] ??= $_ENV['APP_DEBUG'] ?? getenv('APP_DEBUG') ?: null;
}

return function (array $context) {
    return new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);
};
