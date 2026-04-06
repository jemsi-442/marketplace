<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260324130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Attach AI interactions to users so AI history can be stored and queried per account';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE ai_interaction ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS IDX_AI_INTERACTION_USER ON ai_interaction (user_id)');
        $this->addSql('ALTER TABLE ai_interaction ADD CONSTRAINT FK_AI_INTERACTION_USER FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE ai_interaction DROP FOREIGN KEY FK_AI_INTERACTION_USER');
        $this->addSql('DROP INDEX IF EXISTS IDX_AI_INTERACTION_USER ON ai_interaction');
        $this->addSql('ALTER TABLE ai_interaction DROP COLUMN IF EXISTS user_id');
    }
}
