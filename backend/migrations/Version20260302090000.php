<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260302090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Fintech hardening: escrow refs, double-entry wallet ledger, withdrawal lifecycle, and Snippe webhook/api audit tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE escrow ADD COLUMN IF NOT EXISTS reference VARCHAR(64) NULL');
        $this->addSql('ALTER TABLE escrow ADD COLUMN IF NOT EXISTS external_payment_reference VARCHAR(100) DEFAULT NULL');
        $this->addSql('ALTER TABLE escrow ADD COLUMN IF NOT EXISTS external_transaction_id VARCHAR(100) DEFAULT NULL');
        $this->addSql('ALTER TABLE escrow ADD COLUMN IF NOT EXISTS external_status_snapshot JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE escrow ADD COLUMN IF NOT EXISTS risk_metadata JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE escrow ADD COLUMN IF NOT EXISTS funded_at DATETIME DEFAULT NULL');
        $this->addSql('ALTER TABLE escrow ADD COLUMN IF NOT EXISTS active_at DATETIME DEFAULT NULL');
        $this->addSql('ALTER TABLE escrow ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');

        $this->addSql("UPDATE escrow SET reference = CONCAT('escrow_legacy_', id) WHERE reference IS NULL");
        $this->addSql('ALTER TABLE escrow MODIFY reference VARCHAR(64) NOT NULL');

        $this->addSql('CREATE UNIQUE INDEX uniq_escrow_reference ON escrow (reference)');
        $this->addSql('CREATE UNIQUE INDEX uniq_escrow_external_txn ON escrow (external_transaction_id)');

        $this->addSql('CREATE TABLE IF NOT EXISTS wallet_account (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT DEFAULT NULL,
            account_type VARCHAR(40) NOT NULL,
            account_code VARCHAR(80) NOT NULL,
            currency VARCHAR(3) NOT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE INDEX uniq_wallet_account_code (account_code),
            UNIQUE INDEX uniq_wallet_owner_currency (user_id, account_type, currency),
            INDEX IDX_DA22F7A9A76ED395 (user_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
        $this->addSql('ALTER TABLE wallet_account ADD CONSTRAINT FK_DA22F7A9A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');

        $this->addSql('CREATE TABLE IF NOT EXISTS wallet_ledger_entry (
            id INT AUTO_INCREMENT NOT NULL,
            account_id INT NOT NULL,
            counter_account_id INT DEFAULT NULL,
            amount_minor BIGINT NOT NULL,
            currency VARCHAR(3) NOT NULL,
            entry_type VARCHAR(10) NOT NULL,
            reference VARCHAR(120) NOT NULL,
            idempotency_key VARCHAR(120) DEFAULT NULL,
            metadata JSON DEFAULT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE INDEX uniq_wallet_ledger_idempotency_key (idempotency_key),
            INDEX idx_wallet_ledger_account_created (account_id, created_at),
            INDEX idx_wallet_ledger_reference (reference),
            INDEX IDX_56531D479B6B5FBA (counter_account_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
        $this->addSql('ALTER TABLE wallet_ledger_entry ADD CONSTRAINT FK_56531D499B6B5FBA FOREIGN KEY (account_id) REFERENCES wallet_account (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE wallet_ledger_entry ADD CONSTRAINT FK_56531D479B6B5FBA FOREIGN KEY (counter_account_id) REFERENCES wallet_account (id) ON DELETE SET NULL');

        $this->addSql('CREATE TABLE IF NOT EXISTS withdrawal_request (
            id INT AUTO_INCREMENT NOT NULL,
            vendor_id INT NOT NULL,
            reference VARCHAR(64) NOT NULL,
            payout_reference VARCHAR(64) DEFAULT NULL,
            external_transaction_id VARCHAR(100) DEFAULT NULL,
            amount_minor BIGINT NOT NULL,
            fee_minor BIGINT NOT NULL,
            currency VARCHAR(3) NOT NULL,
            status VARCHAR(20) NOT NULL,
            destination_msisdn VARCHAR(15) NOT NULL,
            provider VARCHAR(40) NOT NULL,
            external_status_snapshot JSON DEFAULT NULL,
            failure_reason VARCHAR(255) DEFAULT NULL,
            created_at DATETIME NOT NULL,
            approved_at DATETIME DEFAULT NULL,
            processing_at DATETIME DEFAULT NULL,
            completed_at DATETIME DEFAULT NULL,
            UNIQUE INDEX uniq_withdrawal_reference (reference),
            UNIQUE INDEX uniq_withdrawal_payout_reference (payout_reference),
            UNIQUE INDEX uniq_withdrawal_external_txn (external_transaction_id),
            INDEX IDX_D783A451F603EE73 (vendor_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
        $this->addSql('ALTER TABLE withdrawal_request ADD CONSTRAINT FK_D783A451F603EE73 FOREIGN KEY (vendor_id) REFERENCES user (id)');

        $this->addSql('CREATE TABLE IF NOT EXISTS snippe_api_log (
            id INT AUTO_INCREMENT NOT NULL,
            direction VARCHAR(12) NOT NULL,
            operation VARCHAR(40) NOT NULL,
            reference VARCHAR(120) NOT NULL,
            endpoint VARCHAR(255) NOT NULL,
            http_status SMALLINT DEFAULT NULL,
            payload JSON NOT NULL,
            response_payload JSON DEFAULT NULL,
            created_at DATETIME NOT NULL,
            INDEX idx_snippe_api_ref (reference),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');

        $this->addSql('CREATE TABLE IF NOT EXISTS snippe_webhook_event (
            id INT AUTO_INCREMENT NOT NULL,
            external_reference VARCHAR(100) NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            signature VARCHAR(255) DEFAULT NULL,
            payload JSON NOT NULL,
            received_at DATETIME NOT NULL,
            processed_at DATETIME DEFAULT NULL,
            UNIQUE INDEX uniq_snippe_webhook_external_ref (external_reference),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS snippe_webhook_event');
        $this->addSql('DROP TABLE IF EXISTS snippe_api_log');
        $this->addSql('DROP TABLE IF EXISTS wallet_ledger_entry');
        $this->addSql('DROP TABLE IF EXISTS wallet_account');
        $this->addSql('DROP TABLE IF EXISTS withdrawal_request');

        $this->addSql('DROP INDEX uniq_escrow_reference ON escrow');
        $this->addSql('DROP INDEX uniq_escrow_external_txn ON escrow');
        $this->addSql('ALTER TABLE escrow DROP COLUMN reference');
        $this->addSql('ALTER TABLE escrow DROP COLUMN external_payment_reference');
        $this->addSql('ALTER TABLE escrow DROP COLUMN external_transaction_id');
        $this->addSql('ALTER TABLE escrow DROP COLUMN external_status_snapshot');
        $this->addSql('ALTER TABLE escrow DROP COLUMN risk_metadata');
        $this->addSql('ALTER TABLE escrow DROP COLUMN funded_at');
        $this->addSql('ALTER TABLE escrow DROP COLUMN active_at');
        $this->addSql('ALTER TABLE escrow DROP COLUMN updated_at');
    }
}
