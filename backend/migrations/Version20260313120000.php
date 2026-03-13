<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260313120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Snippe webhook hardening: dedupe by event_id, store sent_at, and allow multiple events per reference';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE snippe_webhook_event ADD COLUMN IF NOT EXISTS event_id VARCHAR(64) NULL');
        $this->addSql('ALTER TABLE snippe_webhook_event ADD COLUMN IF NOT EXISTS sent_at DATETIME DEFAULT NULL');

        $this->addSql("UPDATE snippe_webhook_event SET event_id = CONCAT('legacy_', id) WHERE event_id IS NULL");
        $this->addSql('ALTER TABLE snippe_webhook_event MODIFY event_id VARCHAR(64) NOT NULL');

        $this->addSql('DROP INDEX uniq_snippe_webhook_external_ref ON snippe_webhook_event');
        $this->addSql('CREATE UNIQUE INDEX uniq_snippe_webhook_event_id ON snippe_webhook_event (event_id)');
        $this->addSql('CREATE INDEX idx_snippe_webhook_external_ref ON snippe_webhook_event (external_reference)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_snippe_webhook_external_ref ON snippe_webhook_event');
        $this->addSql('DROP INDEX uniq_snippe_webhook_event_id ON snippe_webhook_event');

        $this->addSql('CREATE UNIQUE INDEX uniq_snippe_webhook_external_ref ON snippe_webhook_event (external_reference)');

        $this->addSql('ALTER TABLE snippe_webhook_event DROP COLUMN event_id');
        $this->addSql('ALTER TABLE snippe_webhook_event DROP COLUMN sent_at');
    }
}
