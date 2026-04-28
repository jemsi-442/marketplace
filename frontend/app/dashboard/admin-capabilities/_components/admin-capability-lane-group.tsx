import { BriefcaseBusiness } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import type { VendorServiceCapabilityRecord } from '@/lib/types';

import {
  formatDateTime,
  formatMoney,
  getReviewLabel,
  getReviewTone,
} from '../admin-capabilities.utils';

interface AdminCapabilityLaneGroupProps {
  lane: string;
  pressureHint: string;
  items: VendorServiceCapabilityRecord[];
}

export function AdminCapabilityLaneGroup({
  lane,
  pressureHint,
  items,
}: AdminCapabilityLaneGroupProps) {
  if (!items.length) {
    return (
      <EmptyState
        icon={<BriefcaseBusiness className="size-5" />}
        title="No capabilities in this lane"
        description="Change the filter or search."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Capability lane</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{lane}</h3>
          <StatusBadge label={`${items.length} in this lane`} tone="info" />
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{pressureHint}</p>
      </div>

      {items.map((capability) => (
        <div key={capability.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-[var(--text-primary)]">{capability.service_type.name}</p>
                <StatusBadge label={getReviewLabel(capability)} tone={getReviewTone(capability)} />
                <StatusBadge label={capability.capacity_status} tone="info" />
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {capability.vendor?.company_name || capability.vendor?.email || 'Vendor profile'} • {capability.service_type.category || lane}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Price: {formatMoney(capability.starting_price_minor)} • Experience: {capability.experience_level}
              </p>

              {capability.reviewed_at ? (
                <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
                  <p>
                    Last review: <span className="font-medium text-[var(--text-primary)]">{formatDateTime(capability.reviewed_at)}</span>
                  </p>
                  <p className="mt-1">
                    Reviewed by:{' '}
                    <span className="font-medium text-[var(--text-primary)]">
                      {capability.reviewed_by_admin?.email || 'WOLFIX admin'}
                    </span>
                  </p>
                  {capability.admin_review_note ? (
                    <p className="mt-2 text-[var(--text-secondary)]">Note: {capability.admin_review_note}</p>
                  ) : null}
                </div>
              ) : capability.admin_review_note ? (
                <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
                  <p>Note: {capability.admin_review_note}</p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard/admin-capabilities/${capability.id}`}>
                <Button variant="ghost">Open lane review</Button>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
