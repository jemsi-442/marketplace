<?php

namespace App\Command;

use App\Service\EscrowAutoReleaseService;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class EscrowAutoReleaseCommand extends Command
{
    protected static $defaultName = 'app:escrow:auto-release';

    public function __construct(
        private EscrowAutoReleaseService $service
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $count = $this->service->run();

        $output->writeln("Auto-released escrows: {$count}");

        return Command::SUCCESS;
    }
}
