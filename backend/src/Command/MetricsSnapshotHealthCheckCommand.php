<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\PlatformMetricsHealthService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:metrics:health-check')]
class MetricsSnapshotHealthCheckCommand extends Command
{
    public function __construct(private readonly PlatformMetricsHealthService $metricsHealthService)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $status = $this->metricsHealthService->getHealthStatus();
        $output->writeln(json_encode($status, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));

        return $status['is_healthy'] ? Command::SUCCESS : Command::FAILURE;
    }
}
