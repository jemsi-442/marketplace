<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260324181500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add updated timestamp for saved AI notes';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE ai_interaction ADD saved_note_updated_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)'");
        $this->addSql('UPDATE ai_interaction SET saved_note_updated_at = saved_at WHERE is_saved_note = 1 AND saved_at IS NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE ai_interaction DROP saved_note_updated_at');
    }
}
