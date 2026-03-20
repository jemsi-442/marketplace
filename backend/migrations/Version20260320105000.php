<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260320105000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Convert escrow milestone amount from floating point to integer minor units';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE escrow_milestone ADD COLUMN amount_minor BIGINT NOT NULL DEFAULT 0');
        $this->addSql('UPDATE escrow_milestone SET amount_minor = ROUND(amount * 100)');
        $this->addSql('ALTER TABLE escrow_milestone DROP COLUMN amount');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE escrow_milestone ADD COLUMN amount DOUBLE PRECISION NOT NULL DEFAULT 0');
        $this->addSql('UPDATE escrow_milestone SET amount = amount_minor / 100');
        $this->addSql('ALTER TABLE escrow_milestone DROP COLUMN amount_minor');
    }
}
