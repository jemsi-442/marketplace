<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260329113000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add admin review note and reviewed_at fields to vendor_service_capability';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vendor_service_capability ADD admin_review_note VARCHAR(500) DEFAULT NULL, ADD reviewed_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vendor_service_capability DROP admin_review_note, DROP reviewed_at');
    }
}
