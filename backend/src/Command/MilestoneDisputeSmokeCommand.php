<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Escrow;
use App\Entity\EscrowMilestone;
use App\Entity\User;
use App\Service\MilestoneDisputeService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:smoke:milestone-dispute')]
class MilestoneDisputeSmokeCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly MilestoneDisputeService $milestoneDisputeService
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $ts = time();
        $suffix = $ts . '_' . random_int(1000, 9999);

        $client = new User();
        $client->setEmail("smoke_client_{$suffix}@test.com");
        $client->setPassword('Password123!');
        $client->setRoles(['ROLE_CLIENT']);

        $vendor = new User();
        $vendor->setEmail("smoke_vendor_{$suffix}@test.com");
        $vendor->setPassword('Password123!');
        $vendor->setRoles(['ROLE_VENDOR']);

        $admin = new User();
        $admin->setEmail("smoke_admin_{$suffix}@test.com");
        $admin->setPassword('Password123!');
        $admin->setRoles(['ROLE_ADMIN']);

        $this->em->persist($client);
        $this->em->persist($vendor);
        $this->em->persist($admin);
        $this->em->flush();

        $escrow = new Escrow("escrow_smoke_{$suffix}", $client, $vendor, 10000, 'TZS');
        $this->em->persist($escrow);

        $milestone = new EscrowMilestone();
        $milestone->setEscrow($escrow);
        $milestone->setTitle('Smoke milestone');
        $milestone->setAmount(100.00);
        $milestone->setReleased(true);
        $this->em->persist($milestone);
        $this->em->flush();

        $dispute = $this->milestoneDisputeService->openDispute($milestone, $client, 'Smoke test dispute');
        $this->milestoneDisputeService->resolveRelease($dispute, $admin);

        $this->em->refresh($dispute);
        $this->em->refresh($milestone);

        $output->writeln(json_encode([
            'dispute_id' => $dispute->getId(),
            'dispute_status' => $dispute->getStatus(),
            'admin_decision' => $dispute->getAdminDecision(),
            'milestone_released' => $milestone->isReleased(),
            'escrow_reference' => $escrow->getReference(),
        ], JSON_PRETTY_PRINT));

        return Command::SUCCESS;
    }
}
