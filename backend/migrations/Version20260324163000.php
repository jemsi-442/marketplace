<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260324163000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Store saved AI note tags on ai_interaction records';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE ai_interaction ADD COLUMN IF NOT EXISTS saved_note_tags LONGTEXT DEFAULT NULL COMMENT '(DC2Type:json)'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE ai_interaction DROP COLUMN IF EXISTS saved_note_tags");
    }
}
