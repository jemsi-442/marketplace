<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260323090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add category field to notifications for finance, escrow, message, risk, and platform grouping';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE notification ADD COLUMN IF NOT EXISTS category VARCHAR(32) NOT NULL DEFAULT 'platform'");
        $this->addSql("UPDATE notification SET category = 'platform' WHERE category = '' OR category IS NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE notification DROP COLUMN IF EXISTS category');
    }
}
