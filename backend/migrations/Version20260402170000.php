<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
use Symfony\Component\String\Slugger\AsciiSlugger;

final class Version20260402170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Expand service catalog with broader category coverage';
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
            ['name' => 'Web Application Development', 'category' => 'Custom Software Development', 'description' => 'Interactive web applications, internal portals, dashboards, and business workflow systems built for browser-based use.'],
            ['name' => 'Marketplace Platform Development', 'category' => 'Custom Software Development', 'description' => 'Service marketplaces, booking platforms, multi-party workflows, and transaction-enabled digital platforms.'],
            ['name' => 'Admin Dashboard Development', 'category' => 'Custom Software Development', 'description' => 'Admin dashboards, reporting consoles, internal review tools, and operational control panels.'],
            ['name' => 'Client Portal Development', 'category' => 'SaaS Product Development', 'description' => 'Secure client workspaces, document portals, service dashboards, and customer self-service interfaces.'],
            ['name' => 'Payment Gateway Integration', 'category' => 'API Development & Integrations', 'description' => 'Payment collection, payout workflows, mobile money integration, and transaction-ready platform setup.'],
            ['name' => 'Workflow Automation Design', 'category' => 'Automation & Integrations', 'description' => 'Automation architecture, process mapping, trigger design, and cross-tool workflow planning.'],
            ['name' => 'WhatsApp Chatbot Setup', 'category' => 'Automation & Integrations', 'description' => 'WhatsApp chatbot flows, automated replies, support routing, and lead capture messaging setup.'],
            ['name' => 'CRM Workflow Automation', 'category' => 'Business Systems Automation', 'description' => 'Pipeline automation, sales workflow logic, reminders, and customer movement automation inside CRM tools.'],
            ['name' => 'Lead Capture Automation', 'category' => 'Business Systems Automation', 'description' => 'Lead forms, qualification flow, routing, follow-up triggers, and handoff automation for sales-ready pipelines.'],
            ['name' => 'CRM Data Migration and Cleanup', 'category' => 'ERP & CRM Setup', 'description' => 'CRM import preparation, contact cleanup, field mapping, and structured data migration support.'],
            ['name' => 'Social Media Creative Design', 'category' => 'Graphic Design', 'description' => 'Static creatives, campaign posts, promotional visuals, and branded assets designed for social platforms.'],
            ['name' => 'Print and Flyer Design', 'category' => 'Graphic Design', 'description' => 'Flyers, posters, brochures, roll-up banners, and print-ready promotional design assets.'],
            ['name' => 'Logo Design', 'category' => 'Brand Identity Design', 'description' => 'Primary logo concepts, brand marks, logo systems, and visual direction for business identity.'],
            ['name' => 'Pitch Deck Design', 'category' => 'Presentation Design', 'description' => 'Investor decks, sales decks, proposal presentations, and high-clarity business storytelling slides.'],
            ['name' => 'Product Prototype Design', 'category' => 'Product Design', 'description' => 'Clickable prototypes, user-flow visuals, early product mockups, and concept validation screens.'],
            ['name' => 'Instagram Management', 'category' => 'Social Media Management', 'description' => 'Instagram content planning, posting cadence, community handling, and profile growth support.'],
            ['name' => 'Facebook Page Management', 'category' => 'Social Media Management', 'description' => 'Facebook content operations, inbox moderation, posting support, and business page management.'],
            ['name' => 'YouTube Channel Management', 'category' => 'Social Media Management', 'description' => 'Channel organization, content scheduling, upload support, metadata handling, and growth coordination for YouTube.'],
            ['name' => 'TikTok Content Management', 'category' => 'Social Media Management', 'description' => 'Short-form content planning, publishing support, and audience rhythm management for TikTok channels.'],
            ['name' => 'Content Calendar Planning', 'category' => 'Social Media Management', 'description' => 'Monthly content planning, posting calendars, campaign structure, and channel-by-channel publishing guidance.'],
            ['name' => 'Social Media Audit', 'category' => 'Social Media Management', 'description' => 'Channel review, performance diagnosis, profile cleanup recommendations, and content direction insights.'],
            ['name' => 'Meta Ads Management', 'category' => 'Performance Marketing', 'description' => 'Facebook and Instagram ad planning, audience targeting, budget handling, and campaign optimization support.'],
            ['name' => 'Google Ads Management', 'category' => 'Performance Marketing', 'description' => 'Search ads, display campaigns, conversion-oriented traffic acquisition, and performance optimization.'],
            ['name' => 'Secure Server Monitoring', 'category' => 'System Administration', 'description' => 'Server health monitoring, alert routing, service uptime checks, and proactive operational oversight.'],
            ['name' => 'Backup and Disaster Recovery Setup', 'category' => 'Cloud Infrastructure', 'description' => 'Backup planning, recovery readiness, restore testing, and continuity setup for critical systems.'],
            ['name' => 'Vulnerability Assessment', 'category' => 'Cybersecurity Services', 'description' => 'Security weakness review, exposure mapping, prioritized remediation findings, and technical risk visibility.'],
            ['name' => 'Network Security Hardening', 'category' => 'Cybersecurity Services', 'description' => 'Network access review, firewall guidance, endpoint protection posture, and environment hardening support.'],
            ['name' => 'Incident Response Support', 'category' => 'Cybersecurity Services', 'description' => 'Security incident triage, containment guidance, issue tracking, and post-incident recovery coordination.'],
            ['name' => 'Security Awareness Training', 'category' => 'Cybersecurity Services', 'description' => 'Staff security awareness guidance, phishing readiness, safe access habits, and digital risk education support.'],
            ['name' => 'NGO Registration Support', 'category' => 'Government Consultancy Services', 'description' => 'Guidance and filing support for NGO registration processes, supporting documents, and compliance follow-through.'],
            ['name' => 'Tender Documentation Support', 'category' => 'Government Consultancy Services', 'description' => 'Tender response preparation, document review, submission readiness, and compliance support for formal bids.'],
            ['name' => 'Tax Clearance Support', 'category' => 'Government Consultancy Services', 'description' => 'Process support for tax clearance-related requirements, supporting documents, and submission readiness.'],
            ['name' => 'Compliance Document Preparation', 'category' => 'Government Consultancy Services', 'description' => 'Structured preparation of compliance documents, supporting packs, and readiness material for regulated processes.'],
        ];
    }

    private function escape(string $value): string
    {
        return str_replace("'", "''", trim($value));
    }
}
