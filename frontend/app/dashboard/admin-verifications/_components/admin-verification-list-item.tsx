'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminVendorVerificationListResponse } from '@/lib/types';

import {
  getVerificationLabel,
  getVerificationReadinessSummary,
  getVerificationTone,
} from '../admin-verifications.utils';

type VerificationItem = AdminVendorVerificationListResponse['items'][number];

interface AdminVerificationListItemProps {
  item: VerificationItem;
}

export function AdminVerificationListItem({
  item,
}: AdminVerificationListItemProps) {
  return (
    <div className="grid gap-4 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,252,0.92)] p-5 lg:grid-cols-[minmax(0,1.2fr)_240px_220px]">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          Vendor verification
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
          {item.vendor.company_name || item.vendor.email}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          {item.professional_headline || 'No professional headline yet.'}
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {getVerificationReadinessSummary({
            resumeUploaded: item.resume_uploaded,
            interviewSubmittedAt: item.interview_submitted_at,
          })}
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Vendor: {item.vendor.email}
        </p>
      </div>

      <div className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Verification state
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge
            label={getVerificationLabel(
              item.verification_status,
              item.verification_badge_granted,
            )}
            tone={getVerificationTone(
              item.verification_status,
              item.verification_badge_granted,
            )}
          />
          {item.resume_uploaded ? (
            <StatusBadge label="Resume ready" tone="info" />
          ) : (
            <StatusBadge label="Resume missing" tone="warning" />
          )}
          {typeof item.interview_score === 'number' ? (
            <StatusBadge
              label={`Score ${item.interview_score}%`}
              tone={item.verification_badge_granted ? 'success' : 'info'}
            />
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-start lg:justify-end">
        <Link
          href={`/dashboard/admin-verifications/${item.id}`}
          className="w-full sm:w-auto"
        >
          <Button className="w-full sm:w-auto">
            Open verification
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
