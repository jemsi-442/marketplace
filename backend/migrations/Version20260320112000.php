<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260320112000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Remove legacy refresh_token column from user table; refresh_tokens table is the sole source of truth';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user DROP COLUMN refresh_token');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user ADD refresh_token VARCHAR(128) DEFAULT NULL');
    }
}
