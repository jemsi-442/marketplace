'use client';

import { Card } from '@/components/ui/card';
import type { VendorServiceCapabilityRecord } from '@/lib/types';

import { formatDateTime } from '../../admin-capabilities.utils';

interface AdminCapabilityDetailsCardProps {
  capability: VendorServiceCapabilityRecord;
}

export function AdminCapabilityDetailsCard({
  capability,
}: AdminCapabilityDetailsCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Capability details
      </p>
      <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-secondary)]">
        <p>
          <span className="font-semibold text-[var(--text-primary)]">
            Vendor email:
          </span>{' '}
          {capability.vendor?.email || '--'}
        </p>
        <p>
          <span className="font-semibold text-[var(--text-primary)]">
            Experience level:
          </span>{' '}
          {capability.experience_level}
        </p>
        <p>
          <span className="font-semibold text-[var(--text-primary)]">
            Turnaround:
          </span>{' '}
          {capability.turnaround_note || 'No turnaround note yet.'}
        </p>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">
            Portfolio or delivery note
          </p>
          <p className="mt-2">
            {capability.portfolio_summary || 'No portfolio summary yet.'}
          </p>
        </div>
        {capability.reviewed_at ? (
          <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--panel-muted)] px-4 py-3">
            <p className="font-semibold text-[var(--text-primary)]">
              Latest review
            </p>
            <p className="mt-2">
              Reviewed at: {formatDateTime(capability.reviewed_at)}
            </p>
            <p className="mt-1">
              Reviewed by:{' '}
              {capability.reviewed_by_admin?.email || 'WOLFIX admin'}
            </p>
          </div>
        ) : null}
        {capability.admin_review_note ? (
          <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--panel-muted)] px-4 py-3">
            <p className="font-semibold text-[var(--text-primary)]">
              Latest admin note
            </p>
            <p className="mt-2">{capability.admin_review_note}</p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
