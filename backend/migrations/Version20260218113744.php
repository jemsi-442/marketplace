<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260218113744 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE ai_interaction (id INT AUTO_INCREMENT NOT NULL, question LONGTEXT NOT NULL, answer LONGTEXT NOT NULL, created_at DATETIME NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE booking (id INT AUTO_INCREMENT NOT NULL, status VARCHAR(50) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, client_id INT NOT NULL, service_id INT NOT NULL, escrow_id INT DEFAULT NULL, INDEX IDX_E00CEDDE19EB6921 (client_id), INDEX IDX_E00CEDDEED5CA9E6 (service_id), UNIQUE INDEX UNIQ_E00CEDDE5A1CD81F (escrow_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE dispute (id INT AUTO_INCREMENT NOT NULL, reason LONGTEXT NOT NULL, status VARCHAR(50) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, booking_id INT NOT NULL, INDEX IDX_3C9250073301C60 (booking_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE escrow (id INT AUTO_INCREMENT NOT NULL, amount_minor BIGINT NOT NULL, currency VARCHAR(3) NOT NULL, status VARCHAR(20) NOT NULL, created_at DATETIME NOT NULL, released_at DATETIME DEFAULT NULL, resolved_at DATETIME DEFAULT NULL, disputed_at DATETIME DEFAULT NULL, admin_decision VARCHAR(255) DEFAULT NULL, dispute_reason LONGTEXT DEFAULT NULL, client_id INT NOT NULL, vendor_id INT NOT NULL, INDEX IDX_56BD27119EB6921 (client_id), INDEX IDX_56BD271F603EE73 (vendor_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE escrow_audit_logs (id INT AUTO_INCREMENT NOT NULL, action VARCHAR(50) NOT NULL, metadata JSON NOT NULL, created_at DATETIME NOT NULL, escrow_id INT NOT NULL, actor_id INT DEFAULT NULL, INDEX IDX_47FA1B7A5A1CD81F (escrow_id), INDEX IDX_47FA1B7A10DAF24A (actor_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE escrow_milestone (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, amount DOUBLE PRECISION NOT NULL, released TINYINT NOT NULL, created_at DATETIME NOT NULL, escrow_id INT NOT NULL, INDEX IDX_FEF336CC5A1CD81F (escrow_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE fraud_risk (id INT AUTO_INCREMENT NOT NULL, score INT NOT NULL, reason VARCHAR(50) NOT NULL, created_at DATETIME NOT NULL, user_id INT DEFAULT NULL, INDEX IDX_3253B7B0A76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE message (id INT AUTO_INCREMENT NOT NULL, content LONGTEXT NOT NULL, created_at DATETIME NOT NULL, sender_id INT NOT NULL, receiver_id INT NOT NULL, INDEX IDX_B6BD307FF624B39D (sender_id), INDEX IDX_B6BD307FCD53EDB6 (receiver_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE milestone_dispute (id INT AUTO_INCREMENT NOT NULL, reason LONGTEXT NOT NULL, status VARCHAR(50) NOT NULL, admin_decision VARCHAR(50) DEFAULT NULL, created_at DATETIME NOT NULL, resolved_at DATETIME DEFAULT NULL, milestone_id INT NOT NULL, opened_by_id INT NOT NULL, INDEX IDX_5447DDBF4B3E2EDA (milestone_id), INDEX IDX_5447DDBFAB159F5 (opened_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE notification (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, message LONGTEXT NOT NULL, is_read TINYINT NOT NULL, created_at DATETIME NOT NULL, user_id INT NOT NULL, INDEX IDX_BF5476CAA76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE partial_release (id INT AUTO_INCREMENT NOT NULL, milestone VARCHAR(255) NOT NULL, amount_minor BIGINT NOT NULL, currency VARCHAR(3) NOT NULL, released TINYINT NOT NULL, created_at DATETIME NOT NULL, escrow_id INT NOT NULL, INDEX IDX_1D7F4C1A5A1CD81F (escrow_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE payment (id INT AUTO_INCREMENT NOT NULL, amount DOUBLE PRECISION NOT NULL, status VARCHAR(50) NOT NULL, created_at DATETIME NOT NULL, booking_id INT NOT NULL, INDEX IDX_6D28840D3301C60 (booking_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE refresh_tokens (id INT AUTO_INCREMENT NOT NULL, token_hash VARCHAR(128) NOT NULL, device_name VARCHAR(255) DEFAULT NULL, ip_address VARCHAR(255) DEFAULT NULL, user_agent VARCHAR(255) DEFAULT NULL, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL, revoked_at DATETIME DEFAULT NULL, user_id INT NOT NULL, INDEX IDX_9BACE7E1A76ED395 (user_id), INDEX idx_token_hash (token_hash), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE review (id INT AUTO_INCREMENT NOT NULL, rating INT NOT NULL, comment LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, booking_id INT NOT NULL, UNIQUE INDEX UNIQ_794381C63301C60 (booking_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE service (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, description LONGTEXT DEFAULT NULL, price NUMERIC(10, 2) NOT NULL, category VARCHAR(100) DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, vendor_id INT NOT NULL, INDEX IDX_E19D9AD2F603EE73 (vendor_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE user (id INT AUTO_INCREMENT NOT NULL, email VARCHAR(180) NOT NULL, roles JSON NOT NULL, password VARCHAR(255) NOT NULL, is_verified TINYINT NOT NULL, is_locked TINYINT NOT NULL, failed_login_attempts INT NOT NULL, verification_token VARCHAR(64) DEFAULT NULL, refresh_token VARCHAR(128) DEFAULT NULL, trust_score DOUBLE PRECISION NOT NULL, risk_level VARCHAR(20) NOT NULL, last_risk_update DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_8D93D649E7927C74 (email), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE user_behavior_profile (id INT AUTO_INCREMENT NOT NULL, avg_transaction_amount DOUBLE PRECISION DEFAULT NULL, avg_daily_transactions INT DEFAULT NULL, usual_login_country VARCHAR(255) DEFAULT NULL, usual_login_hour INT DEFAULT NULL, updated_at DATETIME NOT NULL, user_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_BC7D64DCA76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE vendor_profile (id INT AUTO_INCREMENT NOT NULL, company_name VARCHAR(255) NOT NULL, bio LONGTEXT DEFAULT NULL, website VARCHAR(255) DEFAULT NULL, portfolio_link VARCHAR(255) DEFAULT NULL, user_id INT NOT NULL, UNIQUE INDEX UNIQ_9F209260A76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE booking ADD CONSTRAINT FK_E00CEDDE19EB6921 FOREIGN KEY (client_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE booking ADD CONSTRAINT FK_E00CEDDEED5CA9E6 FOREIGN KEY (service_id) REFERENCES service (id)');
        $this->addSql('ALTER TABLE booking ADD CONSTRAINT FK_E00CEDDE5A1CD81F FOREIGN KEY (escrow_id) REFERENCES escrow (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE dispute ADD CONSTRAINT FK_3C9250073301C60 FOREIGN KEY (booking_id) REFERENCES booking (id)');
        $this->addSql('ALTER TABLE escrow ADD CONSTRAINT FK_56BD27119EB6921 FOREIGN KEY (client_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE escrow ADD CONSTRAINT FK_56BD271F603EE73 FOREIGN KEY (vendor_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE escrow_audit_logs ADD CONSTRAINT FK_47FA1B7A5A1CD81F FOREIGN KEY (escrow_id) REFERENCES escrow (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE escrow_audit_logs ADD CONSTRAINT FK_47FA1B7A10DAF24A FOREIGN KEY (actor_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE escrow_milestone ADD CONSTRAINT FK_FEF336CC5A1CD81F FOREIGN KEY (escrow_id) REFERENCES escrow (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE fraud_risk ADD CONSTRAINT FK_3253B7B0A76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE message ADD CONSTRAINT FK_B6BD307FF624B39D FOREIGN KEY (sender_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE message ADD CONSTRAINT FK_B6BD307FCD53EDB6 FOREIGN KEY (receiver_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE milestone_dispute ADD CONSTRAINT FK_5447DDBF4B3E2EDA FOREIGN KEY (milestone_id) REFERENCES escrow_milestone (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE milestone_dispute ADD CONSTRAINT FK_5447DDBFAB159F5 FOREIGN KEY (opened_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE notification ADD CONSTRAINT FK_BF5476CAA76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE partial_release ADD CONSTRAINT FK_1D7F4C1A5A1CD81F FOREIGN KEY (escrow_id) REFERENCES escrow (id)');
        $this->addSql('ALTER TABLE payment ADD CONSTRAINT FK_6D28840D3301C60 FOREIGN KEY (booking_id) REFERENCES booking (id)');
        $this->addSql('ALTER TABLE refresh_tokens ADD CONSTRAINT FK_9BACE7E1A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE review ADD CONSTRAINT FK_794381C63301C60 FOREIGN KEY (booking_id) REFERENCES booking (id)');
        $this->addSql('ALTER TABLE service ADD CONSTRAINT FK_E19D9AD2F603EE73 FOREIGN KEY (vendor_id) REFERENCES vendor_profile (id)');
        $this->addSql('ALTER TABLE user_behavior_profile ADD CONSTRAINT FK_BC7D64DCA76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE vendor_profile ADD CONSTRAINT FK_9F209260A76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE booking DROP FOREIGN KEY FK_E00CEDDE19EB6921');
        $this->addSql('ALTER TABLE booking DROP FOREIGN KEY FK_E00CEDDEED5CA9E6');
        $this->addSql('ALTER TABLE booking DROP FOREIGN KEY FK_E00CEDDE5A1CD81F');
        $this->addSql('ALTER TABLE dispute DROP FOREIGN KEY FK_3C9250073301C60');
        $this->addSql('ALTER TABLE escrow DROP FOREIGN KEY FK_56BD27119EB6921');
        $this->addSql('ALTER TABLE escrow DROP FOREIGN KEY FK_56BD271F603EE73');
        $this->addSql('ALTER TABLE escrow_audit_logs DROP FOREIGN KEY FK_47FA1B7A5A1CD81F');
        $this->addSql('ALTER TABLE escrow_audit_logs DROP FOREIGN KEY FK_47FA1B7A10DAF24A');
        $this->addSql('ALTER TABLE escrow_milestone DROP FOREIGN KEY FK_FEF336CC5A1CD81F');
        $this->addSql('ALTER TABLE fraud_risk DROP FOREIGN KEY FK_3253B7B0A76ED395');
        $this->addSql('ALTER TABLE message DROP FOREIGN KEY FK_B6BD307FF624B39D');
        $this->addSql('ALTER TABLE message DROP FOREIGN KEY FK_B6BD307FCD53EDB6');
        $this->addSql('ALTER TABLE milestone_dispute DROP FOREIGN KEY FK_5447DDBF4B3E2EDA');
        $this->addSql('ALTER TABLE milestone_dispute DROP FOREIGN KEY FK_5447DDBFAB159F5');
        $this->addSql('ALTER TABLE notification DROP FOREIGN KEY FK_BF5476CAA76ED395');
        $this->addSql('ALTER TABLE partial_release DROP FOREIGN KEY FK_1D7F4C1A5A1CD81F');
        $this->addSql('ALTER TABLE payment DROP FOREIGN KEY FK_6D28840D3301C60');
        $this->addSql('ALTER TABLE refresh_tokens DROP FOREIGN KEY FK_9BACE7E1A76ED395');
        $this->addSql('ALTER TABLE review DROP FOREIGN KEY FK_794381C63301C60');
        $this->addSql('ALTER TABLE service DROP FOREIGN KEY FK_E19D9AD2F603EE73');
        $this->addSql('ALTER TABLE user_behavior_profile DROP FOREIGN KEY FK_BC7D64DCA76ED395');
        $this->addSql('ALTER TABLE vendor_profile DROP FOREIGN KEY FK_9F209260A76ED395');
        $this->addSql('DROP TABLE ai_interaction');
        $this->addSql('DROP TABLE booking');
        $this->addSql('DROP TABLE dispute');
        $this->addSql('DROP TABLE escrow');
        $this->addSql('DROP TABLE escrow_audit_logs');
        $this->addSql('DROP TABLE escrow_milestone');
        $this->addSql('DROP TABLE fraud_risk');
        $this->addSql('DROP TABLE message');
        $this->addSql('DROP TABLE milestone_dispute');
        $this->addSql('DROP TABLE notification');
        $this->addSql('DROP TABLE partial_release');
        $this->addSql('DROP TABLE payment');
        $this->addSql('DROP TABLE refresh_tokens');
        $this->addSql('DROP TABLE review');
        $this->addSql('DROP TABLE service');
        $this->addSql('DROP TABLE user');
        $this->addSql('DROP TABLE user_behavior_profile');
        $this->addSql('DROP TABLE vendor_profile');
    }
}
