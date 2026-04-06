<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260328133000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add assignment state to client requests';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE client_request ADD selected_vendor_id INT DEFAULT NULL, ADD assigned_by_admin_id INT DEFAULT NULL, ADD agreed_price_minor INT DEFAULT NULL, ADD currency VARCHAR(10) DEFAULT NULL");
        $this->addSql('CREATE INDEX IDX_CLIENT_REQUEST_SELECTED_VENDOR ON client_request (selected_vendor_id)');
        $this->addSql('CREATE INDEX IDX_CLIENT_REQUEST_ASSIGNED_ADMIN ON client_request (assigned_by_admin_id)');
        $this->addSql('ALTER TABLE client_request ADD CONSTRAINT FK_CLIENT_REQUEST_SELECTED_VENDOR FOREIGN KEY (selected_vendor_id) REFERENCES vendor_profile (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE client_request ADD CONSTRAINT FK_CLIENT_REQUEST_ASSIGNED_ADMIN FOREIGN KEY (assigned_by_admin_id) REFERENCES user (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE client_request DROP FOREIGN KEY FK_CLIENT_REQUEST_SELECTED_VENDOR');
        $this->addSql('ALTER TABLE client_request DROP FOREIGN KEY FK_CLIENT_REQUEST_ASSIGNED_ADMIN');
        $this->addSql('DROP INDEX IDX_CLIENT_REQUEST_SELECTED_VENDOR ON client_request');
        $this->addSql('DROP INDEX IDX_CLIENT_REQUEST_ASSIGNED_ADMIN ON client_request');
        $this->addSql('ALTER TABLE client_request DROP selected_vendor_id, DROP assigned_by_admin_id, DROP agreed_price_minor, DROP currency');
    }
}
