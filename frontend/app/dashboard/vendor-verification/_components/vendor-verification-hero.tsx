'use client';

import { BadgeCheck } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { VendorProfile } from '@/lib/types';

import type { VerificationTone } from '../vendor-verification.utils';

interface VendorVerificationHeroProps {
  activeLaneCount: number;
  profile: VendorProfile;
  verificationLabel: string;
  verificationTone: VerificationTone;
}

export function VendorVerificationHero({
  activeLaneCount,
  profile,
  verificationLabel,
  verificationTone,
}: VendorVerificationHeroProps) {
  const signalCards = [
    {
      label: 'Resume evidence',
      value: profile.resume_uploaded ? 'Ready' : 'Missing',
      detail: profile.resume_file_name || 'Upload PDF, DOC, DOCX, or TXT.',
    },
    {
      label: 'Interview state',
      value: verificationLabel,
      detail:
        profile.verification_status === 'interview_ready'
          ? 'Questions are ready.'
          : profile.verification_status === 'verified'
            ? 'Verification already passed.'
            : 'Save highlights and generate the interview.',
    },
    {
      label: 'Blue tick',
      value: profile.verification_badge_granted ? 'Active' : 'Not yet',
      detail: profile.verification_badge_granted
        ? 'Your vendor profile is verified.'
        : 'Pass the interview to unlock the badge.',
    },
  ];

  return (
    <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fffb_55%,#eefcf6_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(34,197,94,0.18)] bg-white/84 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-emerald-700">
            <BadgeCheck className="size-3.5" />
            Vendor verification
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
            Show real proof behind your lanes.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            Upload the resume, add a short summary, then answer work-style
            questions.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StatusBadge label={verificationLabel} tone={verificationTone} />
            {profile.interview_score !== null &&
            profile.interview_score !== undefined ? (
              <StatusBadge
                label={`Interview score ${profile.interview_score}%`}
                tone={profile.verification_badge_granted ? 'success' : 'info'}
              />
            ) : null}
            <StatusBadge
              label={`${activeLaneCount} active lane${activeLaneCount === 1 ? '' : 's'}`}
              tone="info"
            />
          </div>
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
