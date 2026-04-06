<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260403110000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add Google and GitHub provider identifiers to user accounts for social sign-in.';
    }

    public function up(Schema $schema): void
    {
        if (!$schema->hasTable('user')) {
            return;
        }

        $columns = array_map(static fn ($column): string => $column->getName(), $schema->getTable('user')->getColumns());

        if (!in_array('google_id', $columns, true)) {
            $this->addSql('ALTER TABLE user ADD google_id VARCHAR(191) DEFAULT NULL');
            $this->addSql('CREATE UNIQUE INDEX UNIQ_8D93D649A5E3602A ON user (google_id)');
        }

        if (!in_array('github_id', $columns, true)) {
            $this->addSql('ALTER TABLE user ADD github_id VARCHAR(191) DEFAULT NULL');
            $this->addSql('CREATE UNIQUE INDEX UNIQ_8D93D649D43ABF5A ON user (github_id)');
        }
    }

    public function down(Schema $schema): void
    {
        if (!$schema->hasTable('user')) {
            return;
        }

        $columns = array_map(static fn ($column): string => $column->getName(), $schema->getTable('user')->getColumns());

        if (in_array('google_id', $columns, true)) {
            $this->addSql('DROP INDEX UNIQ_8D93D649A5E3602A ON user');
            $this->addSql('ALTER TABLE user DROP google_id');
        }

        if (in_array('github_id', $columns, true)) {
            $this->addSql('DROP INDEX UNIQ_8D93D649D43ABF5A ON user');
            $this->addSql('ALTER TABLE user DROP github_id');
        }
    }
}
