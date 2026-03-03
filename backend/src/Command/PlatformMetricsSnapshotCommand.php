<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\PlatformMetricsSnapshotService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:metrics:snapshot')]
class PlatformMetricsSnapshotCommand extends Command
{
    public function __construct(private readonly PlatformMetricsSnapshotService $snapshotService)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $snapshot = $this->snapshotService->createSnapshot();
        $output->writeln(sprintf('Snapshot created for %s', $snapshot->getSnapshotDate()->format('Y-m-d')));

        return Command::SUCCESS;
    }
}
