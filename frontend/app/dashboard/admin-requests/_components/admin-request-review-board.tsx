'use client';

import { ClipboardList, Search } from 'lucide-react';

import { AdminRequestListItem } from './admin-request-list-item';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminClientRequestListResponse } from '@/lib/types';

import type { AdminRequestStatusView } from '../admin-requests.utils';

type RequestItem = AdminClientRequestListResponse['items'][number];

interface AdminRequestReviewBoardProps {
  currentPage: number;
  isError: boolean;
  isLoading: boolean;
  requestItems: RequestItem[];
  resultSummary: string;
  search: string;
  statusView: AdminRequestStatusView;
  summary: {
    total: number;
    open: number;
    needs_review: number;
    awaiting_payment: number;
  };
  totalPages: number;
  onApplyStatusView: (view: AdminRequestStatusView) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onSearchChange: (value: string) => void;
}

const filterOptions: Array<{
  value: AdminRequestStatusView;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'awaiting_payment', label: 'Awaiting payment' },
];

export function AdminRequestReviewBoard({
  currentPage,
  isError,
  isLoading,
  requestItems,
  resultSummary,
  search,
  statusView,
  summary,
  totalPages,
  onApplyStatusView,
  onPreviousPage,
  onNextPage,
  onSearchChange,
}: AdminRequestReviewBoardProps) {
  return (
    <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <Search className="size-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search service, client email, request summary..."
            className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filterOptions.map((filter) => (
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

        <InlineStateNote tone="info" message={resultSummary} />
      </div>
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-[24px]" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="Requests are not loading right now"
          description="Refresh and try again in a moment."
        />
      ) : !requestItems.length ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title={summary.total ? 'No requests match this view' : 'No client requests yet'}
          description={
            summary.total
              ? 'Try another filter or search.'
              : 'New client requests will appear here once work starts moving through the platform.'
          }
        />
      ) : (
        <div className="space-y-4">
          {requestItems.map((request) => (
            <AdminRequestListItem key={request.id} request={request} />
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
