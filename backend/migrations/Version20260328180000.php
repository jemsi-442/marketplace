<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260328180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add delivery submissions for vendor delivery and revision workflow.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE delivery_submission (id INT AUTO_INCREMENT NOT NULL, booking_id INT NOT NULL, vendor_id INT NOT NULL, delivery_note LONGTEXT NOT NULL, delivery_link VARCHAR(500) DEFAULT NULL, status VARCHAR(30) NOT NULL, review_note VARCHAR(500) DEFAULT NULL, submitted_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', reviewed_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX idx_delivery_submission_booking (booking_id), INDEX idx_delivery_submission_vendor (vendor_id), INDEX idx_delivery_submission_status (status), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql('ALTER TABLE delivery_submission ADD CONSTRAINT FK_DELIVERY_SUBMISSION_BOOKING FOREIGN KEY (booking_id) REFERENCES booking (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE delivery_submission ADD CONSTRAINT FK_DELIVERY_SUBMISSION_VENDOR FOREIGN KEY (vendor_id) REFERENCES user (id) ON DELETE RESTRICT');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE delivery_submission DROP FOREIGN KEY FK_DELIVERY_SUBMISSION_BOOKING');
        $this->addSql('ALTER TABLE delivery_submission DROP FOREIGN KEY FK_DELIVERY_SUBMISSION_VENDOR');
        $this->addSql('DROP TABLE delivery_submission');
    }
}
