<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260320123000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Align service table with integer minor-unit pricing and service lifecycle columns';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service ADD COLUMN IF NOT EXISTS price_cents INT NOT NULL DEFAULT 0');
        $this->addSql('UPDATE service SET price_cents = ROUND(price * 100) WHERE price_cents = 0');
        $this->addSql('ALTER TABLE service ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1');
        $this->addSql('ALTER TABLE service ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1');
        $this->addSql('ALTER TABLE service ADD COLUMN IF NOT EXISTS deleted_at DATETIME DEFAULT NULL');
        $this->addSql('ALTER TABLE service DROP COLUMN IF EXISTS price');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0');
        $this->addSql('UPDATE service SET price = price_cents / 100');
        $this->addSql('ALTER TABLE service DROP COLUMN IF EXISTS price_cents');
        $this->addSql('ALTER TABLE service DROP COLUMN IF EXISTS is_active');
        $this->addSql('ALTER TABLE service DROP COLUMN IF EXISTS version');
        $this->addSql('ALTER TABLE service DROP COLUMN IF EXISTS deleted_at');
    }
}
