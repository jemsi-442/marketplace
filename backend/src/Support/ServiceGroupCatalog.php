<?php

declare(strict_types=1);

namespace App\Support;

final class ServiceGroupCatalog
{
    /**
     * @return array<int, array{
     *   slug: string,
     *   title: string,
     *   eyebrow: string,
     *   description: string,
     *   hero_title: string,
     *   hero_description: string,
     *   search_placeholder: string,
     *   category_labels: array<int, string>,
     *   featured_services: array<int, string>
     * }>
     */
    public static function all(): array
    {
        return [
            [
                'slug' => 'software-development',
                'title' => 'Software Development',
                'eyebrow' => 'Build systems',
                'description' => 'Websites, apps, APIs, SaaS products, and engineering work that turns ideas into usable software.',
                'hero_title' => 'Software delivery lanes',
                'hero_description' => 'Open this lane for product buildouts, custom software, websites, apps, integrations, and engineering-heavy work.',
                'search_placeholder' => 'Search software development services',
                'category_labels' => [
                    'Software Engineering',
                    'Web Development',
                    'Mobile App Development',
                    'Website Maintenance',
                    'E-Commerce Development',
                    'WordPress Development',
                    'Frontend Development',
                    'Backend Development',
                    'Full Stack Development',
                    'Custom Software Development',
                    'SaaS Product Development',
                    'API Development & Integrations',
                ],
                'featured_services' => ['Website Development', 'Web Application Development', 'Payment Gateway Integration'],
            ],
            [
                'slug' => 'design-creative',
                'title' => 'Graphics & Design',
                'eyebrow' => 'Design systems',
                'description' => 'Visual identity, UI/UX, brand work, video, motion, and creative assets that shape how the business looks.',
                'hero_title' => 'Creative and design lanes',
                'hero_description' => 'Open this lane for visual communication, websites that need design-led direction, and creative assets across digital channels.',
                'search_placeholder' => 'Search graphics and design services',
                'category_labels' => [
                    'Website Design',
                    'UI/UX Design',
                    'Graphic Design',
                    'Brand Identity Design',
                    'Presentation Design',
                    'Motion Graphics',
                    'Video Editing',
                    'Product Design',
                    'Content Design',
                    'Digital Cards & Smart Profiles',
                ],
                'featured_services' => ['Logo Design', 'Social Media Creative Design', 'Product Prototype Design'],
            ],
            [
                'slug' => 'business-finance-support',
                'title' => 'Business & Finance Support',
                'eyebrow' => 'Strengthen finance',
                'description' => 'Bookkeeping, payroll, reporting, tax readiness, and operational finance support that helps businesses stay controlled and decision-ready.',
                'hero_title' => 'Finance and business support lanes',
                'hero_description' => 'Open this lane for bookkeeping cleanup, payroll support, reporting packs, invoicing operations, and practical finance coordination for growing teams.',
                'search_placeholder' => 'Search business and finance support services',
                'category_labels' => [
                    'Bookkeeping & Accounting',
                    'Payroll Support',
                    'Financial Reporting',
                    'Tax Preparation Support',
                    'Invoicing & Billing Operations',
                    'Budgeting & Forecasting',
                ],
                'featured_services' => ['Management Accounts Preparation', 'Payroll Administration Support', 'Cash Flow Tracking Setup'],
            ],
            [
                'slug' => 'social-media-marketing',
                'title' => 'Social Media & Marketing',
                'eyebrow' => 'Grow audience',
                'description' => 'Social management, content, ads, SEO, email, and campaign work that helps brands grow and stay visible.',
                'hero_title' => 'Social growth and campaign lanes',
                'hero_description' => 'Open this lane for Instagram, Facebook, YouTube, content, SEO, ads, and visibility work across digital channels.',
                'search_placeholder' => 'Search social media and marketing services',
                'category_labels' => [
                    'Social Media Management',
                    'Community Management',
                    'Copywriting',
                    'Technical Writing',
                    'SEO',
                    'Digital Marketing',
                    'Performance Marketing',
                    'Email Marketing',
                    'Analytics & Dashboards',
                ],
                'featured_services' => ['Instagram Management', 'Meta Ads Management', 'YouTube Channel Management'],
            ],
            [
                'slug' => 'content-media-communications',
                'title' => 'Content, Media & Communications',
                'eyebrow' => 'Shape the message',
                'description' => 'Writing, audio, video, translation, media kits, newsletters, and communication assets that help teams publish clearly and consistently.',
                'hero_title' => 'Content and communications lanes',
                'hero_description' => 'Open this lane for content production, scripts, podcasts, voice-over, translation, PR packs, and communication-ready publishing support.',
                'search_placeholder' => 'Search content media and communications services',
                'category_labels' => [
                    'Content Writing',
                    'Script Writing',
                    'Voice Over & Audio Production',
                    'Podcast Production',
                    'Translation & Transcription',
                    'Public Relations & Media Kits',
                    'Newsletter Production',
                ],
                'featured_services' => ['Press Release Writing', 'Podcast Editing and Production', 'Content Repurposing Support'],
            ],
            [
                'slug' => 'cybersecurity-infrastructure',
                'title' => 'Cybersecurity & Infrastructure',
                'eyebrow' => 'Protect systems',
                'description' => 'Security, cloud, admin, infrastructure, testing, support, and technical foundations that keep systems stable and safe.',
                'hero_title' => 'Security and infrastructure lanes',
                'hero_description' => 'Open this lane for audits, hardening, cloud setup, server management, testing, and stability-critical technical support.',
                'search_placeholder' => 'Search cybersecurity and infrastructure services',
                'category_labels' => [
                    'System Administration',
                    'Cloud Infrastructure',
                    'DevOps & CI/CD',
                    'Cybersecurity Services',
                    'Security Audit & Penetration Testing',
                    'IT Support & Helpdesk',
                    'Database Administration',
                    'QA & Software Testing',
                ],
                'featured_services' => ['Vulnerability Assessment', 'Incident Response Support', 'Security Awareness Training'],
            ],
            [
                'slug' => 'training-research-documentation',
                'title' => 'Training, Research & Documentation',
                'eyebrow' => 'Document operations',
                'description' => 'Research packs, proposals, SOPs, training materials, and structured documents that help teams explain, teach, and operate with clarity.',
                'hero_title' => 'Research and documentation lanes',
                'hero_description' => 'Open this lane for proposal writing, research support, SOPs, policy manuals, workshop decks, and internal documentation that needs rigor.',
                'search_placeholder' => 'Search training research and documentation services',
                'category_labels' => [
                    'Research Support',
                    'Proposal & Grant Writing',
                    'SOP & Policy Documentation',
                    'Training Materials Development',
                    'Monitoring & Evaluation Reporting',
                    'Workshop & Facilitation Support',
                ],
                'featured_services' => ['Business Proposal Writing', 'Operations Manual Development', 'Donor Reporting Support'],
            ],
            [
                'slug' => 'government-consultancy',
                'title' => 'Government Consultancy',
                'eyebrow' => 'Compliance support',
                'description' => 'Government-facing advisory and compliance work where process, documentation, and institutional clarity matter most.',
                'hero_title' => 'Government consultancy lane',
                'hero_description' => 'Open this lane for regulated coordination, institutional processes, and consultancy work that needs formal handling.',
                'search_placeholder' => 'Search government consultancy services',
                'category_labels' => ['Government Consultancy Services'],
                'featured_services' => ['Business Registration with BRELA', 'Tender Documentation Support', 'NGO Registration Support'],
            ],
            [
                'slug' => 'automation-operations',
                'title' => 'Automation & Business Operations',
                'eyebrow' => 'Run operations',
                'description' => 'Automation, messaging, CRM/ERP setup, dashboards, and operational support that keep businesses moving efficiently.',
                'hero_title' => 'Automation and operations lanes',
                'hero_description' => 'Open this lane for workflow design, messaging systems, CRM/ERP setup, support tasks, and process-heavy internal operations.',
                'search_placeholder' => 'Search automation and operations services',
                'category_labels' => [
                    'Automation & Integrations',
                    'Business Systems Automation',
                    'Bulk SMS & Messaging Solutions',
                    'ERP & CRM Setup',
                    'Data Entry & Virtual Assistance',
                ],
                'featured_services' => ['Workflow Automation Design', 'WhatsApp Chatbot Setup', 'CRM Workflow Automation'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function findBySlug(string $slug): ?array
    {
        $normalized = mb_strtolower(trim($slug));
        foreach (self::all() as $group) {
            if ($group['slug'] === $normalized) {
                return $group;
            }
        }

        return null;
    }

    public static function resolveSlugForCategory(?string $category): string
    {
        $normalized = self::normalize($category);
        if ($normalized === '') {
            return 'automation-operations';
        }

        foreach (self::all() as $group) {
            foreach ($group['category_labels'] as $label) {
                if (self::normalize($label) === $normalized) {
                    return $group['slug'];
                }
            }
        }

        return 'automation-operations';
    }

    /**
     * @return array<int, string>
     */
    public static function categoriesForSlug(string $slug): array
    {
        $group = self::findBySlug($slug);
        if ($group === null) {
            return [];
        }

        return $group['category_labels'];
    }

    private static function normalize(?string $value): string
    {
        return mb_strtolower(trim((string) $value));
    }
}
