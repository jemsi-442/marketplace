<?php

declare(strict_types=1);

use App\Kernel;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__) . '/vendor/autoload.php';

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__) . '/.env');
}

$_SERVER['APP_ENV'] = $_ENV['APP_ENV'] = 'dev';
$_SERVER['APP_DEBUG'] = $_ENV['APP_DEBUG'] = '0';

$kernel = new Kernel('dev', false);

return new Application($kernel);
