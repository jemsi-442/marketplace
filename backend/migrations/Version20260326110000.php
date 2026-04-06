<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260326110000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add client booking requirements fields';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE booking ADD request_summary VARCHAR(220) NOT NULL DEFAULT '', ADD scope_details LONGTEXT DEFAULT NULL, ADD deadline_note VARCHAR(160) DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE booking DROP request_summary, DROP scope_details, DROP deadline_note');
    }
}
