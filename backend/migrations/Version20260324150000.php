<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260324150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Store saved AI notes directly on ai_interaction records';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE ai_interaction ADD COLUMN IF NOT EXISTS is_saved_note TINYINT(1) NOT NULL DEFAULT 0");
        $this->addSql("ALTER TABLE ai_interaction ADD COLUMN IF NOT EXISTS saved_note_title VARCHAR(160) DEFAULT NULL");
        $this->addSql("ALTER TABLE ai_interaction ADD COLUMN IF NOT EXISTS saved_at DATETIME DEFAULT NULL");
        $this->addSql("CREATE INDEX IF NOT EXISTS IDX_AI_INTERACTION_SAVED_NOTE ON ai_interaction (is_saved_note, saved_at)");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DROP INDEX IF EXISTS IDX_AI_INTERACTION_SAVED_NOTE ON ai_interaction");
        $this->addSql("ALTER TABLE ai_interaction DROP COLUMN IF EXISTS saved_at");
        $this->addSql("ALTER TABLE ai_interaction DROP COLUMN IF EXISTS saved_note_title");
        $this->addSql("ALTER TABLE ai_interaction DROP COLUMN IF EXISTS is_saved_note");
    }
}
