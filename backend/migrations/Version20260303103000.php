<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260303103000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'AI marketplace extension: vendor trust profiles, escrow risk profiles, fraud signals, and platform metrics snapshots';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE IF NOT EXISTS vendor_trust_profile (
            id INT AUTO_INCREMENT NOT NULL,
            vendor_id INT NOT NULL,
            completed_jobs_count INT NOT NULL,
            dispute_count INT NOT NULL,
            average_rating DOUBLE PRECISION NOT NULL,
            escrow_release_ratio DOUBLE PRECISION NOT NULL,
            on_time_delivery_ratio DOUBLE PRECISION NOT NULL,
            refund_ratio DOUBLE PRECISION NOT NULL,
            total_volume_minor BIGINT NOT NULL,
            calculated_trust_score DOUBLE PRECISION NOT NULL,
            risk_level VARCHAR(20) NOT NULL,
            last_calculation_metadata JSON DEFAULT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE INDEX uniq_vendor_trust_vendor (vendor_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
        $this->addSql('ALTER TABLE vendor_trust_profile ADD CONSTRAINT FK_VENDOR_TRUST_VENDOR FOREIGN KEY (vendor_id) REFERENCES user (id) ON DELETE CASCADE');

        $this->addSql('CREATE TABLE IF NOT EXISTS escrow_risk_profile (
            id INT AUTO_INCREMENT NOT NULL,
            escrow_id INT NOT NULL,
            client_risk_score DOUBLE PRECISION NOT NULL,
            vendor_risk_score DOUBLE PRECISION NOT NULL,
            amount_risk_factor DOUBLE PRECISION NOT NULL,
            geo_risk_factor DOUBLE PRECISION NOT NULL,
            anomaly_flag TINYINT(1) NOT NULL,
            final_risk_score DOUBLE PRECISION NOT NULL,
            manual_review_required TINYINT(1) NOT NULL,
            factors_snapshot JSON DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE INDEX uniq_escrow_risk_escrow (escrow_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
        $this->addSql('ALTER TABLE escrow_risk_profile ADD CONSTRAINT FK_ESCROW_RISK_ESCROW FOREIGN KEY (escrow_id) REFERENCES escrow (id) ON DELETE CASCADE');

        $this->addSql('CREATE TABLE IF NOT EXISTS fraud_signal (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            signal_type VARCHAR(60) NOT NULL,
            severity SMALLINT NOT NULL,
            metadata JSON NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX idx_fraud_signal_user_created (user_id, created_at),
            INDEX idx_fraud_signal_type (signal_type),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
        $this->addSql('ALTER TABLE fraud_signal ADD CONSTRAINT FK_FRAUD_SIGNAL_USER FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');

        $this->addSql('CREATE TABLE IF NOT EXISTS platform_metrics_snapshot (
            id INT AUTO_INCREMENT NOT NULL,
            total_volume_minor BIGINT NOT NULL,
            total_fees_collected_minor BIGINT NOT NULL,
            dispute_rate DOUBLE PRECISION NOT NULL,
            refund_rate DOUBLE PRECISION NOT NULL,
            avg_trust_score DOUBLE PRECISION NOT NULL,
            high_risk_escrow_percentage DOUBLE PRECISION NOT NULL,
            snapshot_date DATE NOT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE INDEX uniq_platform_metrics_snapshot_date (snapshot_date),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS platform_metrics_snapshot');
        $this->addSql('DROP TABLE IF EXISTS fraud_signal');
        $this->addSql('DROP TABLE IF EXISTS escrow_risk_profile');
        $this->addSql('DROP TABLE IF EXISTS vendor_trust_profile');
    }
}
