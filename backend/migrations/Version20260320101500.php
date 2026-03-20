<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260320101500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Harden fraud risk snapshots with risk levels and metadata, and store user fraud risk score';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user ADD COLUMN IF NOT EXISTS fraud_risk_score SMALLINT NOT NULL DEFAULT 0');

        $this->addSql('ALTER TABLE fraud_risk MODIFY reason VARCHAR(255) NOT NULL');
        $this->addSql('ALTER TABLE fraud_risk ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT NULL');
        $this->addSql('ALTER TABLE fraud_risk ADD COLUMN IF NOT EXISTS metadata JSON DEFAULT NULL');

        $this->addSql("UPDATE fraud_risk SET risk_level = CASE
            WHEN score >= 80 THEN 'CRITICAL'
            WHEN score >= 60 THEN 'HIGH'
            WHEN score >= 35 THEN 'MEDIUM'
            ELSE 'LOW'
        END
        WHERE risk_level IS NULL");

        $this->addSql('ALTER TABLE fraud_risk MODIFY risk_level VARCHAR(20) NOT NULL');

        $this->addSql('CREATE INDEX IF NOT EXISTS idx_fraud_risk_user_created ON fraud_risk (user_id, created_at)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_fraud_risk_level ON fraud_risk (risk_level)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_fraud_risk_user_created ON fraud_risk');
        $this->addSql('DROP INDEX IF EXISTS idx_fraud_risk_level ON fraud_risk');

        $this->addSql('ALTER TABLE fraud_risk DROP COLUMN risk_level');
        $this->addSql('ALTER TABLE fraud_risk DROP COLUMN metadata');
        $this->addSql('ALTER TABLE fraud_risk MODIFY reason VARCHAR(50) NOT NULL');

        $this->addSql('ALTER TABLE user DROP COLUMN fraud_risk_score');
    }
}
