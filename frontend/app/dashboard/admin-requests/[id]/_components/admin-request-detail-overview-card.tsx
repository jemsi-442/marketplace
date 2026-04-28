'use client';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { RequestReviewInsight } from '@/lib/services/request-review-insights';
import type { AdminClientRequestInterestsResponse } from '@/lib/types';

interface AdminRequestDetailOverviewCardProps {
  interestCount: number;
  laneInsight: RequestReviewInsight;
  request: AdminClientRequestInterestsResponse['request'];
}

export function AdminRequestDetailOverviewCard({
  interestCount,
  laneInsight,
  request,
}: AdminRequestDetailOverviewCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        {laneInsight.laneLabel}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
        {request.service_type.name}
      </h2>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
        {request.request_summary}
      </p>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
        {laneInsight.adminSummary}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge label={request.status} tone="info" />
        <StatusBadge label={`${interestCount} proposals`} tone="warning" />
      </div>
    </Card>
  );
}
