<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260402200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Remove legacy booking to service relation now that bookings are opened only from platform-managed requests';
    }

    public function up(Schema $schema): void
    {
        if (!$schema->hasTable('booking')) {
            return;
        }

        $table = $schema->getTable('booking');
        if (!$table->hasColumn('service_id')) {
            return;
        }

        foreach ($table->getForeignKeys() as $foreignKey) {
            if (in_array('service_id', $foreignKey->getLocalColumns(), true)) {
                $this->addSql(sprintf('ALTER TABLE booking DROP FOREIGN KEY %s', $foreignKey->getName()));
            }
        }

        foreach ($table->getIndexes() as $index) {
            if ($index->isPrimary()) {
                continue;
            }

            if (in_array('service_id', $index->getColumns(), true)) {
                $this->addSql(sprintf('DROP INDEX %s ON booking', $index->getName()));
            }
        }

        $this->addSql('ALTER TABLE booking DROP service_id');
    }

    public function down(Schema $schema): void
    {
        if (!$schema->hasTable('booking')) {
            return;
        }

        $table = $schema->getTable('booking');
        if ($table->hasColumn('service_id')) {
            return;
        }

        $this->addSql('ALTER TABLE booking ADD service_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE booking ADD CONSTRAINT FK_BOOKING_SERVICE_ID FOREIGN KEY (service_id) REFERENCES service (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_BOOKING_SERVICE_ID ON booking (service_id)');
    }
}
