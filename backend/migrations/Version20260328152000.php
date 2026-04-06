<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260328152000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Extend bookings to support admin-assigned client requests and platform-managed payment flow.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE booking DROP FOREIGN KEY FK_E00CEDDEED5CA9E6');
        $this->addSql('ALTER TABLE booking ADD client_request_id INT DEFAULT NULL, ADD assigned_vendor_id INT DEFAULT NULL, ADD agreed_price_minor INT DEFAULT NULL, ADD currency VARCHAR(10) DEFAULT NULL');
        $this->addSql('ALTER TABLE booking CHANGE service_id service_id INT DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_BOOKING_CLIENT_REQUEST ON booking (client_request_id)');
        $this->addSql('CREATE INDEX IDX_BOOKING_ASSIGNED_VENDOR ON booking (assigned_vendor_id)');
        $this->addSql('ALTER TABLE booking ADD CONSTRAINT FK_BOOKING_CLIENT_REQUEST FOREIGN KEY (client_request_id) REFERENCES client_request (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE booking ADD CONSTRAINT FK_BOOKING_ASSIGNED_VENDOR FOREIGN KEY (assigned_vendor_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE booking ADD CONSTRAINT FK_E00CEDDEED5CA9E6 FOREIGN KEY (service_id) REFERENCES service (id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE booking DROP FOREIGN KEY FK_BOOKING_CLIENT_REQUEST');
        $this->addSql('ALTER TABLE booking DROP FOREIGN KEY FK_BOOKING_ASSIGNED_VENDOR');
        $this->addSql('ALTER TABLE booking DROP FOREIGN KEY FK_E00CEDDEED5CA9E6');
        $this->addSql('DROP INDEX UNIQ_BOOKING_CLIENT_REQUEST ON booking');
        $this->addSql('DROP INDEX IDX_BOOKING_ASSIGNED_VENDOR ON booking');
        $this->addSql('ALTER TABLE booking DROP client_request_id, DROP assigned_vendor_id, DROP agreed_price_minor, DROP currency');
        $this->addSql('ALTER TABLE booking CHANGE service_id service_id INT NOT NULL');
        $this->addSql('ALTER TABLE booking ADD CONSTRAINT FK_E00CEDDEED5CA9E6 FOREIGN KEY (service_id) REFERENCES service (id)');
    }
}
