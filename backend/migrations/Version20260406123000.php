<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
use Symfony\Component\String\Slugger\AsciiSlugger;

final class Version20260406123000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Expand new business finance, content, and training lanes with more starter services';
    }

    public function up(Schema $schema): void
    {
        $slugger = new AsciiSlugger();

        foreach ($this->items() as $item) {
            $slug = strtolower($slugger->slug($item['name'])->toString());
            $name = $this->escape($item['name']);
            $category = $this->escape($item['category']);
            $description = $this->escape($item['description']);

            $this->addSql(sprintf(
                "INSERT INTO service_type (name, slug, description, category, is_active, requires_admin_assignment, default_brief_template, created_at, updated_at)
                 VALUES ('%s', '%s', '%s', '%s', 1, 1, NULL, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    description = VALUES(description),
                    category = VALUES(category),
                    is_active = VALUES(is_active),
                    updated_at = NOW()",
                $name,
                $slug,
                $description,
                $category
            ));
        }
    }

    public function down(Schema $schema): void
    {
        $slugger = new AsciiSlugger();
        $slugs = [];

        foreach ($this->items() as $item) {
            $slugs[] = sprintf("'%s'", strtolower($slugger->slug($item['name'])->toString()));
        }

        if ($slugs !== []) {
            $this->addSql(sprintf('DELETE FROM service_type WHERE slug IN (%s)', implode(', ', $slugs)));
        }
    }

    /**
     * @return array<int, array{name: string, category: string, description: string}>
     */
    private function items(): array
    {
        return [
            ['name' => 'Accounts Payable Support', 'category' => 'Bookkeeping & Accounting', 'description' => 'Supplier invoice handling, payable tracking, payment scheduling, and recurring vendor payment support for internal finance teams.'],
            ['name' => 'Accounts Receivable Support', 'category' => 'Bookkeeping & Accounting', 'description' => 'Receivable tracking, collection follow-up structure, client billing support, and overdue invoice coordination.'],
            ['name' => 'Cash Flow Tracking Setup', 'category' => 'Budgeting & Forecasting', 'description' => 'Cash flow visibility setup, tracking templates, movement planning, and decision-ready operating cash views.'],
            ['name' => 'Expense Tracking and Cleanup', 'category' => 'Bookkeeping & Accounting', 'description' => 'Expense categorization, record cleanup, internal spending visibility, and reporting-ready transaction organization.'],
            ['name' => 'Management Accounts Preparation', 'category' => 'Financial Reporting', 'description' => 'Management accounts, internal finance summaries, recurring reporting packs, and structured financial snapshots for operators.'],
            ['name' => 'Financial Controls Review', 'category' => 'Financial Reporting', 'description' => 'Finance process review, control points, operational safeguards, and recommendations that improve internal accountability.'],
            ['name' => 'Press Release Writing', 'category' => 'Public Relations & Media Kits', 'description' => 'Press releases, announcement drafts, public updates, and media-facing communication support for launches and milestones.'],
            ['name' => 'Speech Writing Support', 'category' => 'Script Writing', 'description' => 'Speech drafts, keynote support, public remarks, and presentation-led writing for leaders and institutions.'],
            ['name' => 'Case Study Writing', 'category' => 'Content Writing', 'description' => 'Case studies, proof-of-work narratives, impact summaries, and customer success storytelling for business credibility.'],
            ['name' => 'Interview Transcription', 'category' => 'Translation & Transcription', 'description' => 'Interview transcript preparation, meeting transcript cleanup, and structured text conversion from recorded conversations.'],
            ['name' => 'Subtitling and Caption Support', 'category' => 'Voice Over & Audio Production', 'description' => 'Subtitle preparation, caption cleanup, and publishing-ready text overlays for videos and recorded media assets.'],
            ['name' => 'Content Repurposing Support', 'category' => 'Content Writing', 'description' => 'Turn one source asset into multiple publishable outputs across articles, newsletters, short-form content, and communication packs.'],
            ['name' => 'Project Concept Note Writing', 'category' => 'Proposal & Grant Writing', 'description' => 'Concept notes, early project framing documents, and structured summaries used to shape formal proposals or donor conversations.'],
            ['name' => 'Business Proposal Writing', 'category' => 'Proposal & Grant Writing', 'description' => 'Business proposals, commercial offer documents, and structured submissions designed to win formal work or partnerships.'],
            ['name' => 'Donor Reporting Support', 'category' => 'Monitoring & Evaluation Reporting', 'description' => 'Donor-facing progress reports, narrative support, compliance-ready updates, and structured reporting for funded work.'],
            ['name' => 'Employee Handbook Development', 'category' => 'SOP & Policy Documentation', 'description' => 'Employee handbooks, workplace guidance packs, internal expectations, and people-operations documents for growing teams.'],
            ['name' => 'Operations Manual Development', 'category' => 'SOP & Policy Documentation', 'description' => 'Operational manuals, department process guides, and internal operating documents that improve repeatability and control.'],
            ['name' => 'Research Interview Guide Preparation', 'category' => 'Research Support', 'description' => 'Interview guides, research prompts, field conversation structure, and preparation support for formal information gathering.'],
        ];
    }

    private function escape(string $value): string
    {
        return str_replace("'", "''", trim($value));
    }
}
