'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import { Card } from '@/components/ui/card';
import type { RequestReviewInsight } from '@/lib/services/request-review-insights';
import type { ClientRequestRecord } from '@/lib/types';

import { getClientRequestDetailTone } from '../request-detail.utils';

interface ClientRequestOverviewCardProps {
  laneInsight: RequestReviewInsight;
  request: ClientRequestRecord;
}

export function ClientRequestOverviewCard({
  laneInsight,
  request,
}: ClientRequestOverviewCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        {laneInsight.laneLabel}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
        {request.service_type.name}
      </h2>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
        {request.request_summary}
      </p>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
        {laneInsight.clientSummary}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge
          label={request.status}
          tone={getClientRequestDetailTone(request.status)}
        />
        {typeof request.unread_thread_count === 'number' &&
        request.unread_thread_count > 0 ? (
          <StatusBadge
            label={`${request.unread_thread_count} unread`}
            tone="warning"
          />
        ) : null}
      </div>
    </Card>
  );
}
