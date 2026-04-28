'use client';

import { Card } from '@/components/ui/card';
import type { AdminOpsOverview } from '@/lib/types';

interface NotificationAdminOpsCardsProps {
  feedbackRequestId: string | null;
  opsOverview: AdminOpsOverview | undefined;
}

export function NotificationAdminOpsCards({
  feedbackRequestId,
  opsOverview,
}: NotificationAdminOpsCardsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Support reference
        </p>
        <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
          {feedbackRequestId ?? 'No active failure'}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {feedbackRequestId
            ? 'Use this request ID to follow the failed action in logs.'
            : 'When an admin action fails, the request ID will appear here.'}
        </p>
      </Card>
      <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Metrics freshness
        </p>
        <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
          {opsOverview?.metrics_pipeline.status ?? 'Waiting'}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {opsOverview?.metrics_pipeline.message ??
            'Waiting for the latest pipeline signal.'}
        </p>
      </Card>
      <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Upload scanning
        </p>
        <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
          {opsOverview?.upload_scanning.status ?? 'Checking'}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {opsOverview?.upload_scanning.message ??
            'Waiting for scanner posture.'}
        </p>
      </Card>
    </div>
  );
}
