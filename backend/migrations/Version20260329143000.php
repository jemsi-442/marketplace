<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260329143000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add reviewed_by_admin_id to vendor_service_capability for review audit trail';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vendor_service_capability ADD reviewed_by_admin_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE vendor_service_capability ADD CONSTRAINT FK_6C42019A11F133EC FOREIGN KEY (reviewed_by_admin_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_6C42019A11F133EC ON vendor_service_capability (reviewed_by_admin_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vendor_service_capability DROP FOREIGN KEY FK_6C42019A11F133EC');
        $this->addSql('DROP INDEX IDX_6C42019A11F133EC ON vendor_service_capability');
        $this->addSql('ALTER TABLE vendor_service_capability DROP reviewed_by_admin_id');
    }
}
