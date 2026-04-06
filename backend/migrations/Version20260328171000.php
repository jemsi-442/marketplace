<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260328171000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add read tracking to messages for unread request and booking thread counts.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE message ADD read_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)'");
        $this->addSql('CREATE INDEX IDX_MESSAGE_READ_AT ON message (read_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IDX_MESSAGE_READ_AT ON message');
        $this->addSql('ALTER TABLE message DROP read_at');
    }
}
