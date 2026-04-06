<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260328120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add request marketplace phase 1 tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE service_type (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(160) NOT NULL, slug VARCHAR(180) NOT NULL, description LONGTEXT DEFAULT NULL, category VARCHAR(120) DEFAULT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, requires_admin_assignment TINYINT(1) NOT NULL DEFAULT 1, default_brief_template LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', UNIQUE INDEX UNIQ_SERVICE_TYPE_NAME (name), UNIQUE INDEX UNIQ_SERVICE_TYPE_SLUG (slug), INDEX idx_service_type_slug (slug), INDEX idx_service_type_category (category), INDEX idx_service_type_active (is_active), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");

        $this->addSql("CREATE TABLE client_request (id INT AUTO_INCREMENT NOT NULL, client_id INT NOT NULL, service_type_id INT NOT NULL, request_summary VARCHAR(220) NOT NULL, scope_details LONGTEXT DEFAULT NULL, deadline_note VARCHAR(160) DEFAULT NULL, budget_note VARCHAR(160) DEFAULT NULL, attachments_count INT DEFAULT NULL, status VARCHAR(40) NOT NULL, submitted_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', matched_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', assigned_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', cancelled_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX idx_client_request_client (client_id), INDEX idx_client_request_service_type (service_type_id), INDEX idx_client_request_status (status), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");

        $this->addSql("CREATE TABLE vendor_service_capability (id INT AUTO_INCREMENT NOT NULL, vendor_id INT NOT NULL, service_type_id INT NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, experience_level VARCHAR(40) NOT NULL, starting_price_minor INT DEFAULT NULL, portfolio_summary LONGTEXT DEFAULT NULL, capacity_status VARCHAR(40) NOT NULL, turnaround_note VARCHAR(255) DEFAULT NULL, approved_by_admin TINYINT(1) NOT NULL DEFAULT 0, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX idx_vendor_service_capability_vendor (vendor_id), INDEX idx_vendor_service_capability_service_type (service_type_id), INDEX idx_vendor_service_capability_active (is_active), UNIQUE INDEX uniq_vendor_service_capability (vendor_id, service_type_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");

        $this->addSql("CREATE TABLE vendor_request_interest (id INT AUTO_INCREMENT NOT NULL, client_request_id INT NOT NULL, vendor_id INT NOT NULL, message LONGTEXT DEFAULT NULL, proposed_price_minor INT DEFAULT NULL, timeline_note VARCHAR(255) DEFAULT NULL, status VARCHAR(30) NOT NULL, submitted_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', reviewed_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX idx_vendor_request_interest_request (client_request_id), INDEX idx_vendor_request_interest_vendor (vendor_id), INDEX idx_vendor_request_interest_status (status), UNIQUE INDEX uniq_vendor_request_interest (client_request_id, vendor_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");

        $this->addSql('ALTER TABLE client_request ADD CONSTRAINT FK_CLIENT_REQUEST_CLIENT FOREIGN KEY (client_id) REFERENCES user (id) ON DELETE RESTRICT');
        $this->addSql('ALTER TABLE client_request ADD CONSTRAINT FK_CLIENT_REQUEST_SERVICE_TYPE FOREIGN KEY (service_type_id) REFERENCES service_type (id) ON DELETE RESTRICT');
        $this->addSql('ALTER TABLE vendor_service_capability ADD CONSTRAINT FK_VENDOR_SERVICE_CAPABILITY_VENDOR FOREIGN KEY (vendor_id) REFERENCES vendor_profile (id) ON DELETE RESTRICT');
        $this->addSql('ALTER TABLE vendor_service_capability ADD CONSTRAINT FK_VENDOR_SERVICE_CAPABILITY_SERVICE_TYPE FOREIGN KEY (service_type_id) REFERENCES service_type (id) ON DELETE RESTRICT');
        $this->addSql('ALTER TABLE vendor_request_interest ADD CONSTRAINT FK_VENDOR_REQUEST_INTEREST_REQUEST FOREIGN KEY (client_request_id) REFERENCES client_request (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE vendor_request_interest ADD CONSTRAINT FK_VENDOR_REQUEST_INTEREST_VENDOR FOREIGN KEY (vendor_id) REFERENCES vendor_profile (id) ON DELETE RESTRICT');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vendor_request_interest DROP FOREIGN KEY FK_VENDOR_REQUEST_INTEREST_REQUEST');
        $this->addSql('ALTER TABLE vendor_request_interest DROP FOREIGN KEY FK_VENDOR_REQUEST_INTEREST_VENDOR');
        $this->addSql('ALTER TABLE vendor_service_capability DROP FOREIGN KEY FK_VENDOR_SERVICE_CAPABILITY_VENDOR');
        $this->addSql('ALTER TABLE vendor_service_capability DROP FOREIGN KEY FK_VENDOR_SERVICE_CAPABILITY_SERVICE_TYPE');
        $this->addSql('ALTER TABLE client_request DROP FOREIGN KEY FK_CLIENT_REQUEST_CLIENT');
        $this->addSql('ALTER TABLE client_request DROP FOREIGN KEY FK_CLIENT_REQUEST_SERVICE_TYPE');

        $this->addSql('DROP TABLE vendor_request_interest');
        $this->addSql('DROP TABLE vendor_service_capability');
        $this->addSql('DROP TABLE client_request');
        $this->addSql('DROP TABLE service_type');
    }
}
