<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260324133000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add AI interaction context tag and context data for page-aware AI history';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE ai_interaction ADD COLUMN IF NOT EXISTS context_tag VARCHAR(80) DEFAULT NULL');
        $this->addSql('ALTER TABLE ai_interaction ADD COLUMN IF NOT EXISTS context_data JSON DEFAULT NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS IDX_AI_INTERACTION_CONTEXT_TAG ON ai_interaction (context_tag)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS IDX_AI_INTERACTION_CONTEXT_TAG ON ai_interaction');
        $this->addSql('ALTER TABLE ai_interaction DROP COLUMN IF EXISTS context_tag');
        $this->addSql('ALTER TABLE ai_interaction DROP COLUMN IF EXISTS context_data');
    }
}
