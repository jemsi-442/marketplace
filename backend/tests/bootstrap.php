<?php

declare(strict_types=1);

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__) . '/vendor/autoload.php';

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__) . '/.env');
}

if (($_SERVER['APP_ENV'] ?? $_ENV['APP_ENV'] ?? null) === 'test') {
    $testDatabaseUrl = $_SERVER['TEST_DATABASE_URL'] ?? $_ENV['TEST_DATABASE_URL'] ?? null;

    if (is_string($testDatabaseUrl) && $testDatabaseUrl !== '') {
        putenv('DATABASE_URL=' . $testDatabaseUrl);
        $_ENV['DATABASE_URL'] = $testDatabaseUrl;
        $_SERVER['DATABASE_URL'] = $testDatabaseUrl;
    }
}
