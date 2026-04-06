<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260324170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add saved AI note state and follow-up scheduling fields';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE ai_interaction ADD saved_note_state VARCHAR(24) DEFAULT NULL, ADD saved_note_follow_up_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE ai_interaction DROP saved_note_state, DROP saved_note_follow_up_at');
    }
}
