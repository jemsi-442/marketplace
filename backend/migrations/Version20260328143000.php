<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260328143000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add vendor proposal reasoning and assignment timeline fields';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE vendor_request_interest ADD price_reason VARCHAR(500) DEFAULT NULL");
        $this->addSql("ALTER TABLE client_request ADD agreed_timeline_note VARCHAR(255) DEFAULT NULL, ADD admin_assignment_note VARCHAR(500) DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vendor_request_interest DROP price_reason');
        $this->addSql('ALTER TABLE client_request DROP agreed_timeline_note, DROP admin_assignment_note');
    }
}
