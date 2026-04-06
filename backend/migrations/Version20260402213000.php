<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260402213000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop retired legacy service table now that service-type, capability, and request flows fully replaced it.';
    }

    public function up(Schema $schema): void
    {
        if (!$schema->hasTable('service')) {
            return;
        }

        $this->addSql('DROP TABLE service');
    }

    public function down(Schema $schema): void
    {
        if ($schema->hasTable('service')) {
            return;
        }

        $this->addSql(<<<'SQL'
CREATE TABLE service (
    id INT AUTO_INCREMENT NOT NULL,
    vendor_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description LONGTEXT DEFAULT NULL,
    price_cents INT NOT NULL DEFAULT 0,
    category VARCHAR(100) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    version INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    deleted_at DATETIME DEFAULT NULL,
    INDEX IDX_E19D9AD2F603EE73 (vendor_id),
    INDEX idx_service_vendor (vendor_id),
    INDEX idx_service_category (category),
    PRIMARY KEY(id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
SQL);
        $this->addSql('ALTER TABLE service ADD CONSTRAINT FK_E19D9AD2F603EE73 FOREIGN KEY (vendor_id) REFERENCES vendor_profile (id) ON DELETE RESTRICT');
    }
}
