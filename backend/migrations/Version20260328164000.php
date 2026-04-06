<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260328164000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add client request and booking thread context to messages for admin-managed coordination.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE message ADD client_request_id INT DEFAULT NULL, ADD booking_id INT DEFAULT NULL');
        $this->addSql('CREATE INDEX IDX_MESSAGE_CLIENT_REQUEST ON message (client_request_id)');
        $this->addSql('CREATE INDEX IDX_MESSAGE_BOOKING ON message (booking_id)');
        $this->addSql('ALTER TABLE message ADD CONSTRAINT FK_MESSAGE_CLIENT_REQUEST FOREIGN KEY (client_request_id) REFERENCES client_request (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE message ADD CONSTRAINT FK_MESSAGE_BOOKING FOREIGN KEY (booking_id) REFERENCES booking (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE message DROP FOREIGN KEY FK_MESSAGE_CLIENT_REQUEST');
        $this->addSql('ALTER TABLE message DROP FOREIGN KEY FK_MESSAGE_BOOKING');
        $this->addSql('DROP INDEX IDX_MESSAGE_CLIENT_REQUEST ON message');
        $this->addSql('DROP INDEX IDX_MESSAGE_BOOKING ON message');
        $this->addSql('ALTER TABLE message DROP client_request_id, DROP booking_id');
    }
}
