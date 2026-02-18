<?php

namespace App\Command;

use App\Service\EscrowAutoReleaseService;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:escrow:auto-release')]
class EscrowAutoReleaseCommand extends Command
{
    public function __construct(
        private EscrowAutoReleaseService $service
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $count = $this->service->autoRelease();
        $output->writeln("$count escrows released.");

        return Command::SUCCESS;
    }
}
