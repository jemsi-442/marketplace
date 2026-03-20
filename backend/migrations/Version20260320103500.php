<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260320103500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Convert payment and behavior profile amounts from floating point to integer minor units';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE payment ADD COLUMN amount_minor BIGINT NOT NULL DEFAULT 0');
        $this->addSql('UPDATE payment SET amount_minor = ROUND(amount * 100)');
        $this->addSql('ALTER TABLE payment DROP COLUMN amount');

        $this->addSql('ALTER TABLE user_behavior_profile ADD COLUMN avg_transaction_amount_minor BIGINT DEFAULT NULL');
        $this->addSql('UPDATE user_behavior_profile SET avg_transaction_amount_minor = ROUND(avg_transaction_amount * 100) WHERE avg_transaction_amount IS NOT NULL');
        $this->addSql('ALTER TABLE user_behavior_profile DROP COLUMN avg_transaction_amount');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE payment ADD COLUMN amount DOUBLE PRECISION NOT NULL DEFAULT 0');
        $this->addSql('UPDATE payment SET amount = amount_minor / 100');
        $this->addSql('ALTER TABLE payment DROP COLUMN amount_minor');

        $this->addSql('ALTER TABLE user_behavior_profile ADD COLUMN avg_transaction_amount DOUBLE PRECISION DEFAULT NULL');
        $this->addSql('UPDATE user_behavior_profile SET avg_transaction_amount = avg_transaction_amount_minor / 100 WHERE avg_transaction_amount_minor IS NOT NULL');
        $this->addSql('ALTER TABLE user_behavior_profile DROP COLUMN avg_transaction_amount_minor');
    }
}
