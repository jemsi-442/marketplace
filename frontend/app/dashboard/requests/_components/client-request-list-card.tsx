'use client';

import { ClipboardList } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientRequestListResponse } from '@/lib/types';

import {
  clientRequestStatusViewOptions,
  type ClientRequestStatusView,
} from '../requests.utils';
import { ClientRequestListItem } from './client-request-list-item';

type ClientRequestItem = ClientRequestListResponse['items'][number];

interface ClientRequestListCardProps {
  currentPage: number;
  requestItems: ClientRequestItem[];
  statusView: ClientRequestStatusView;
  summary: {
    total: number;
    active: number;
    awaiting_payment: number;
    completed: number;
  };
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  onApplyStatusView: (view: ClientRequestStatusView) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function ClientRequestListCard({
  currentPage,
  requestItems,
  statusView,
  summary,
  totalPages,
  isLoading,
  isError,
  onApplyStatusView,
  onPreviousPage,
  onNextPage,
}: ClientRequestListCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap gap-2">
        {clientRequestStatusViewOptions.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onApplyStatusView(filter.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              statusView === filter.value
                ? 'border-[var(--brand-primary)] bg-[rgba(59,130,246,0.12)] text-[var(--brand-primary)]'
                : 'border-[var(--line)] bg-white text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.08)]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-[24px]" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="Requests are not loading right now"
          description="Refresh and try again in a moment."
        />
      ) : !summary.total ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="No requests yet"
          description="Open a business lane and send your first request."
          action={
            <Link href="/dashboard/request-services" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Open lanes</Button>
            </Link>
          }
        />
      ) : !requestItems.length ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="No requests in this view"
          description="Try another filter."
        />
      ) : (
        <div className="space-y-4">
          {requestItems.map((request) => (
            <ClientRequestListItem key={request.id} request={request} />
          ))}

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="w-full sm:w-auto"
                  variant="ghost"
                  onClick={onPreviousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  variant="ghost"
                  onClick={onNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
