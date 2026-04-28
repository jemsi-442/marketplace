'use client';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { VendorRequestFeedRecord } from '@/lib/types';

interface VendorRequestOverviewCardProps {
  laneLabel: string;
  fitSummary: string;
  request: VendorRequestFeedRecord;
}

export function VendorRequestOverviewCard({
  laneLabel,
  fitSummary,
  request,
}: VendorRequestOverviewCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        {laneLabel}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
        {request.service_type.name}
      </h2>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
        {request.request_summary}
      </p>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
        {fitSummary}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge
          label={request.interest ? 'Proposal sent' : 'Proposal needed'}
          tone={request.interest ? 'success' : 'info'}
        />
      </div>
    </Card>
  );
}
