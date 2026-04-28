'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { getRequestReviewInsight } from '@/lib/services/request-review-insights';
import type { ClientRequestListResponse } from '@/lib/types';

import {
  getClientRequestLaneListSummary,
  getClientRequestTone,
} from '../requests.utils';

type ClientRequestItem = ClientRequestListResponse['items'][number];

interface ClientRequestListItemProps {
  request: ClientRequestItem;
}

export function ClientRequestListItem({
  request,
}: ClientRequestListItemProps) {
  const laneInsight = getRequestReviewInsight(
    request.service_type.group_slug,
    request.service_type.group_title,
  );
  const laneListSummary = getClientRequestLaneListSummary(
    request.service_type.group_slug,
    request.service_type.group_title,
  );

  return (
    <div className="grid gap-4 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,252,0.92)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] lg:grid-cols-[minmax(0,1.2fr)_220px_220px]">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          {laneInsight.laneLabel}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
          {request.service_type.name}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          {request.request_summary}
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {laneListSummary}
        </p>
      </div>

      <div className="h-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Status
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge
            label={request.status}
            tone={getClientRequestTone(request.status)}
          />
          {typeof request.unread_thread_count === 'number' &&
          request.unread_thread_count > 0 ? (
            <StatusBadge
              label={`${request.unread_thread_count} unread`}
              tone="warning"
            />
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-start lg:h-full lg:justify-end">
        <Link href={`/dashboard/requests/${request.id}`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            Open request
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
