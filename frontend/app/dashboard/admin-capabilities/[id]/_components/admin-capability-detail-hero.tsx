'use client';

import { ShieldCheck } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminLaneReviewGuidance } from '@/lib/services/vendor-capability-review-insights';
import type { VendorServiceCapabilityRecord } from '@/lib/types';

import {
  formatDateTime,
  formatMoney,
  getReviewLabel,
  getReviewTone,
} from '../../admin-capabilities.utils';

interface AdminCapabilityDetailHeroProps {
  capability: VendorServiceCapabilityRecord;
  laneGuidance: AdminLaneReviewGuidance;
}

export function AdminCapabilityDetailHero({
  capability,
  laneGuidance,
}: AdminCapabilityDetailHeroProps) {
  const reviewPostureItems = [
    {
      label: 'Starting price',
      value: formatMoney(capability.starting_price_minor),
    },
    {
      label: 'Experience',
      value: capability.experience_level || '--',
    },
    {
      label: 'Last review',
      value: capability.reviewed_at
        ? formatDateTime(capability.reviewed_at)
        : 'Not reviewed yet',
    },
  ];

  return (
    <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.10),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8faff_56%,#eef3ff_100%)] p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.16)] bg-white/84 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">
            <ShieldCheck className="size-3.5" />
            Capability review
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge
              label={
                capability.service_type.group_title ||
                capability.service_type.category ||
                'Capability lane'
              }
              tone="info"
            />
            <StatusBadge
              label={getReviewLabel(capability)}
              tone={getReviewTone(capability)}
            />
            <StatusBadge label={capability.capacity_status} tone="info" />
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            {capability.service_type.name}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            {laneGuidance.laneSummary}
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            {capability.vendor?.company_name ||
              capability.vendor?.email ||
              'Vendor profile'}{' '}
            • {capability.service_type.category || 'Uncategorized'}
          </p>
        </div>

        <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Review posture
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {reviewPostureItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-4"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
