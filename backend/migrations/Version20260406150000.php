<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260406150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add vendor resume, verification, and interview fields to vendor profiles.';
    }

    public function up(Schema $schema): void
    {
        if (!$schema->hasTable('vendor_profile')) {
            return;
        }

        $columns = array_map(static fn ($column): string => $column->getName(), $schema->getTable('vendor_profile')->getColumns());

        if (!in_array('professional_headline', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD professional_headline VARCHAR(255) DEFAULT NULL');
        }

        if (!in_array('resume_highlights', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD resume_highlights LONGTEXT DEFAULT NULL');
        }

        if (!in_array('resume_original_name', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD resume_original_name VARCHAR(255) DEFAULT NULL');
        }

        if (!in_array('resume_storage_path', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD resume_storage_path VARCHAR(255) DEFAULT NULL');
        }

        if (!in_array('resume_mime_type', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD resume_mime_type VARCHAR(120) DEFAULT NULL');
        }

        if (!in_array('resume_uploaded_at', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD resume_uploaded_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
        }

        if (!in_array('verification_status', $columns, true)) {
            $this->addSql("ALTER TABLE vendor_profile ADD verification_status VARCHAR(40) NOT NULL DEFAULT 'not_started'");
        }

        if (!in_array('verification_badge_granted', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD verification_badge_granted TINYINT(1) NOT NULL DEFAULT 0');
        }

        if (!in_array('verification_badge_granted_at', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD verification_badge_granted_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
        }

        if (!in_array('interview_questions', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD interview_questions JSON DEFAULT NULL');
        }

        if (!in_array('interview_answers', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD interview_answers JSON DEFAULT NULL');
        }

        if (!in_array('interview_score', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD interview_score INT DEFAULT NULL');
        }

        if (!in_array('interview_submitted_at', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD interview_submitted_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
        }

        if (!in_array('verification_review_note', $columns, true)) {
            $this->addSql('ALTER TABLE vendor_profile ADD verification_review_note VARCHAR(500) DEFAULT NULL');
        }
    }

    public function down(Schema $schema): void
    {
        if (!$schema->hasTable('vendor_profile')) {
            return;
        }

        $columns = array_map(static fn ($column): string => $column->getName(), $schema->getTable('vendor_profile')->getColumns());

        foreach ([
            'verification_review_note',
            'interview_submitted_at',
            'interview_score',
            'interview_answers',
            'interview_questions',
            'verification_badge_granted_at',
            'verification_badge_granted',
            'verification_status',
            'resume_uploaded_at',
            'resume_mime_type',
            'resume_storage_path',
            'resume_original_name',
            'resume_highlights',
            'professional_headline',
        ] as $column) {
            if (in_array($column, $columns, true)) {
                $this->addSql(sprintf('ALTER TABLE vendor_profile DROP %s', $column));
            }
        }
    }
}
