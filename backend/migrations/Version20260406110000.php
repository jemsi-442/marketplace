<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
use Symfony\Component\String\Slugger\AsciiSlugger;

final class Version20260406110000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add business finance, content media, and training research service types';
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
            ['name' => 'Bookkeeping Support', 'category' => 'Bookkeeping & Accounting', 'description' => 'Ongoing bookkeeping, transaction cleanup, account organization, and routine financial record support.'],
            ['name' => 'Monthly Reconciliation Support', 'category' => 'Bookkeeping & Accounting', 'description' => 'Monthly account checks, reconciliation support, ledger balancing, and close-readiness for internal finance control.'],
            ['name' => 'Payroll Administration Support', 'category' => 'Payroll Support', 'description' => 'Payroll preparation, staff payment coordination, deductions review, and recurring payroll process support.'],
            ['name' => 'Financial Reporting Pack', 'category' => 'Financial Reporting', 'description' => 'Monthly and quarterly reporting packs, management summaries, and finance views for decision-making.'],
            ['name' => 'Tax Filing Preparation Support', 'category' => 'Tax Preparation Support', 'description' => 'Tax-ready documentation support, filing preparation, and structured finance handoff before submission.'],
            ['name' => 'Invoicing and Billing Operations', 'category' => 'Invoicing & Billing Operations', 'description' => 'Invoice preparation, billing follow-up coordination, and receivables workflow support for service businesses.'],
            ['name' => 'Budgeting and Forecast Planning', 'category' => 'Budgeting & Forecasting', 'description' => 'Budget templates, operating forecasts, planning support, and financial outlook preparation for growing teams.'],
            ['name' => 'Article and Blog Writing', 'category' => 'Content Writing', 'description' => 'Articles, blog posts, editorial content, and structured writing that supports publishing and audience education.'],
            ['name' => 'Website and Campaign Copywriting', 'category' => 'Content Writing', 'description' => 'Website copy, campaign messaging, landing page text, and conversion-ready business writing.'],
            ['name' => 'Script Writing Support', 'category' => 'Script Writing', 'description' => 'Scripts for videos, ads, explainers, interviews, podcasts, and presentation-led storytelling.'],
            ['name' => 'Voice Over Recording Support', 'category' => 'Voice Over & Audio Production', 'description' => 'Voice-over production support for explainer videos, ads, training materials, and public-facing media assets.'],
            ['name' => 'Podcast Editing and Production', 'category' => 'Podcast Production', 'description' => 'Podcast editing, audio cleanup, episode packaging, and publishing-ready production support.'],
            ['name' => 'Translation and Transcription Support', 'category' => 'Translation & Transcription', 'description' => 'Translation, transcription, bilingual content handling, and transcript preparation for business and media use.'],
            ['name' => 'Media Kit and PR Pack Preparation', 'category' => 'Public Relations & Media Kits', 'description' => 'Media kits, press packs, company fact sheets, and structured communication packs for public-facing outreach.'],
            ['name' => 'Newsletter Planning and Production', 'category' => 'Newsletter Production', 'description' => 'Newsletter copy, issue planning, publishing rhythm, and communication support for email-based updates.'],
            ['name' => 'Research Summary Pack', 'category' => 'Research Support', 'description' => 'Structured research summaries, desk research support, source gathering, and insight packs for business or institutional work.'],
            ['name' => 'Market and Competitor Research Support', 'category' => 'Research Support', 'description' => 'Competitor review, market scan support, research notes, and comparative analysis for planning and positioning.'],
            ['name' => 'Proposal and Grant Writing Support', 'category' => 'Proposal & Grant Writing', 'description' => 'Business proposals, donor-facing submissions, grant support, and structured bid writing for formal applications.'],
            ['name' => 'SOP and Policy Manual Development', 'category' => 'SOP & Policy Documentation', 'description' => 'Operational SOPs, policy manuals, internal rules, and documentation that helps teams run with consistency.'],
            ['name' => 'Training Deck and Manual Creation', 'category' => 'Training Materials Development', 'description' => 'Training decks, participant manuals, onboarding packs, and session-ready learning materials for staff or partners.'],
            ['name' => 'Monitoring and Evaluation Reporting', 'category' => 'Monitoring & Evaluation Reporting', 'description' => 'Monitoring reports, indicator narratives, progress summaries, and structured reporting for program delivery.'],
            ['name' => 'Workshop Agenda and Facilitation Pack', 'category' => 'Workshop & Facilitation Support', 'description' => 'Workshop agendas, facilitation guides, participant flow materials, and session support documents for trainings and events.'],
        ];
    }

    private function escape(string $value): string
    {
        return str_replace("'", "''", trim($value));
    }
}
