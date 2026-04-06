<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\ServiceType;
use App\Repository\ServiceTypeRepository;
use App\Support\ServiceTypeCatalog;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\String\Slugger\AsciiSlugger;

#[AsCommand(name: 'app:seed:service-types')]
final class SeedServiceTypesCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ServiceTypeRepository $serviceTypeRepository
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $slugger = new AsciiSlugger();
        $created = 0;
        $updated = 0;

        foreach (ServiceTypeCatalog::items() as $item) {
            $slug = strtolower($slugger->slug($item['name'])->toString());

            $serviceType = $this->serviceTypeRepository->findOneBy(['slug' => $slug]);
            if (!$serviceType instanceof ServiceType) {
                $serviceType = new ServiceType();
                $serviceType->setSlug($slug);
                $this->em->persist($serviceType);
                $created++;
            } else {
                $updated++;
            }

            $serviceType
                ->setName($item['name'])
                ->setCategory($item['category'])
                ->setDescription($item['description'])
                ->setIsActive(true)
                ->setRequiresAdminAssignment($item['requires_admin_assignment'] ?? true)
                ->setDefaultBriefTemplate($item['default_brief_template'] ?? null);
        }

        $this->em->flush();

        $output->writeln(sprintf('Service types seeded: %d created, %d updated.', $created, $updated));
        $output->writeln(sprintf('Total catalog size: %d', count(ServiceTypeCatalog::items())));

        return Command::SUCCESS;
    }
}
