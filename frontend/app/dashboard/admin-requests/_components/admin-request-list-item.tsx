import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { getRequestReviewInsight } from '@/lib/services/request-review-insights';
import type { AdminClientRequestRecord } from '@/lib/types';

import { getLaneListSummary, getRequestTone } from '../admin-requests.utils';

interface AdminRequestListItemProps {
  request: AdminClientRequestRecord;
}

export function AdminRequestListItem({ request }: AdminRequestListItemProps) {
  const laneInsight = getRequestReviewInsight(
    request.service_type.group_slug,
    request.service_type.group_title,
  );
  const laneListSummary = getLaneListSummary(request);

  return (
    <div className="grid gap-4 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,252,0.92)] p-5 lg:grid-cols-[minmax(0,1.2fr)_240px_220px]">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--brand-primary)]">{laneInsight.laneLabel}</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{request.service_type.name}</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{request.request_summary}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{laneListSummary}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Client: {request.client.email}</p>
      </div>
      <div className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Request state</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge label={request.status} tone={getRequestTone(request.status)} />
          {request.selected_vendor ? <StatusBadge label="Vendor selected" tone="warning" /> : null}
        </div>
      </div>
      <div className="flex items-center justify-start lg:justify-end">
        <Link href={`/dashboard/admin-requests/${request.id}`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            Open request review
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
