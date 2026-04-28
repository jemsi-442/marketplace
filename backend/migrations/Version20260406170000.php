<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260406170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add vendor interview attempt history for verification progress tracking';
    }

    public function up(Schema $schema): void
    {
        $columns = array_map(
            static fn (array $column): string => (string) ($column['Field'] ?? ''),
            $this->connection->fetchAllAssociative('SHOW COLUMNS FROM vendor_profile')
        );

        if (!in_array('interview_attempt_history', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD interview_attempt_history JSON DEFAULT NULL');
        }
    }

    public function down(Schema $schema): void
    {
        $columns = array_map(
            static fn (array $column): string => (string) ($column['Field'] ?? ''),
            $this->connection->fetchAllAssociative('SHOW COLUMNS FROM vendor_profile')
        );

        if (in_array('interview_attempt_history', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile DROP interview_attempt_history');
        }
    }
}
