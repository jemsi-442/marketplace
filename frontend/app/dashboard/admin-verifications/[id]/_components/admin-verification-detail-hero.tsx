'use client';

import { BadgeCheck } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminVendorVerificationRecord } from '@/lib/types';

interface AdminVerificationDetailHeroProps {
  data: AdminVendorVerificationRecord;
  verificationLabel: string;
  verificationTone: 'success' | 'warning' | 'info';
}

export function AdminVerificationDetailHero({
  data,
  verificationLabel,
  verificationTone,
}: AdminVerificationDetailHeroProps) {
  const signalCards = [
    {
      label: 'Resume file',
      value: data.resume_file_name || 'No file uploaded',
      detail: data.resume_uploaded_at
        ? `Uploaded ${data.resume_uploaded_at}`
        : 'Resume evidence is still missing.',
    },
    {
      label: 'Current badge',
      value: data.verification_badge_granted ? 'Blue tick active' : 'Not active',
      detail: data.verification_badge_granted_at
        ? `Granted ${data.verification_badge_granted_at}`
        : 'Use approve or revoke after reading the interview and resume.',
    },
    {
      label: 'Review note',
      value: data.verification_review_note || 'No review note yet',
      detail: data.vendor.email,
    },
  ];

  return (
    <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef5ff_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(59,130,246,0.16)] bg-white/84 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">
            <BadgeCheck className="size-3.5" />
            Verification review
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
            {data.vendor.company_name || data.vendor.email}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            {data.professional_headline || 'No professional headline yet.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge label={verificationLabel} tone={verificationTone} />
            {data.resume_uploaded ? (
              <StatusBadge label="Resume uploaded" tone="info" />
            ) : (
              <StatusBadge label="Resume missing" tone="warning" />
            )}
            {typeof data.interview_score === 'number' ? (
              <StatusBadge
                label={`Interview ${data.interview_score}%`}
                tone={data.verification_badge_granted ? 'success' : 'info'}
              />
            ) : null}
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            {data.resume_highlights || 'No resume highlights yet.'}
          </p>
        </div>

        <div className="grid gap-3">
          {signalCards.map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-white/90 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {item.label}
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
