<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use App\Support\ServiceTypeCatalog;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
use Symfony\Component\String\Slugger\AsciiSlugger;

final class Version20260328134500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Seed baseline service types for request marketplace';
    }

    public function up(Schema $schema): void
    {
        $slugger = new AsciiSlugger();

        foreach (ServiceTypeCatalog::items() as $item) {
            $slug = strtolower($slugger->slug($item['name'])->toString());
            $name = $this->escape($item['name']);
            $category = $this->escape($item['category']);
            $description = $this->escape($item['description']);
            $defaultBriefTemplate = $this->escape($item['default_brief_template'] ?? null);
            $requiresAdminAssignment = ($item['requires_admin_assignment'] ?? true) ? 1 : 0;

            $this->addSql(sprintf(
                "INSERT INTO service_type (name, slug, description, category, is_active, requires_admin_assignment, default_brief_template, created_at, updated_at)
                 VALUES ('%s', '%s', %s, '%s', 1, %d, %s, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    description = VALUES(description),
                    category = VALUES(category),
                    is_active = VALUES(is_active),
                    requires_admin_assignment = VALUES(requires_admin_assignment),
                    default_brief_template = VALUES(default_brief_template),
                    updated_at = NOW()",
                $name,
                $slug,
                $description !== null ? sprintf("'%s'", $description) : 'NULL',
                $category,
                $requiresAdminAssignment,
                $defaultBriefTemplate !== null ? sprintf("'%s'", $defaultBriefTemplate) : 'NULL'
            ));
        }
    }

    public function down(Schema $schema): void
    {
        $slugger = new AsciiSlugger();
        $slugs = [];

        foreach (ServiceTypeCatalog::items() as $item) {
            $slugs[] = sprintf("'%s'", strtolower($slugger->slug($item['name'])->toString()));
        }

        if ($slugs !== []) {
            $this->addSql(sprintf('DELETE FROM service_type WHERE slug IN (%s)', implode(', ', $slugs)));
        }
    }

    private function escape(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return str_replace("'", "''", trim($value));
    }
}
