<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260328193000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add delivery attachment references for delivery submissions.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE delivery_attachment (id INT AUTO_INCREMENT NOT NULL, delivery_submission_id INT DEFAULT NULL, file_name VARCHAR(180) NOT NULL, file_url VARCHAR(500) NOT NULL, mime_type VARCHAR(120) DEFAULT NULL, size_bytes INT DEFAULT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX idx_delivery_attachment_delivery (delivery_submission_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql('ALTER TABLE delivery_attachment ADD CONSTRAINT FK_DELIVERY_ATTACHMENT_DELIVERY FOREIGN KEY (delivery_submission_id) REFERENCES delivery_submission (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE delivery_attachment DROP FOREIGN KEY FK_DELIVERY_ATTACHMENT_DELIVERY');
        $this->addSql('DROP TABLE delivery_attachment');
    }
}
