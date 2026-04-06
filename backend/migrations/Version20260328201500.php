<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260328201500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add booking service snapshot fields for gradual removal of direct service dependency';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE booking ADD service_price_snapshot_minor INT DEFAULT NULL, ADD service_title_snapshot VARCHAR(220) DEFAULT NULL, ADD service_category_snapshot VARCHAR(160) DEFAULT NULL');
        $this->addSql('UPDATE booking b LEFT JOIN service s ON b.service_id = s.id SET b.service_price_snapshot_minor = COALESCE(b.agreed_price_minor, s.price_cents), b.service_title_snapshot = COALESCE(s.title, b.request_summary), b.service_category_snapshot = s.category WHERE b.service_id IS NOT NULL');
        $this->addSql('UPDATE booking b LEFT JOIN client_request cr ON b.client_request_id = cr.id LEFT JOIN service_type st ON cr.service_type_id = st.id SET b.service_price_snapshot_minor = COALESCE(b.service_price_snapshot_minor, b.agreed_price_minor), b.service_title_snapshot = COALESCE(b.service_title_snapshot, st.name, b.request_summary), b.service_category_snapshot = COALESCE(b.service_category_snapshot, st.category) WHERE b.client_request_id IS NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE booking DROP service_price_snapshot_minor, DROP service_title_snapshot, DROP service_category_snapshot');
    }
}
