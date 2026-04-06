<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260328194500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add internal storage path for delivery attachments.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE delivery_attachment ADD storage_path VARCHAR(500) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE delivery_attachment DROP storage_path');
    }
}
