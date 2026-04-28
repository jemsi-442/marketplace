'use client';

import { ArrowRight, ClipboardList, Search } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { getVendorRequestMatchInsight } from '@/lib/services/vendor-request-match-insights';
import type { VendorRequestFeedListResponse } from '@/lib/types';

import {
  formatVendorRequestMoney,
  getVendorRequestTone,
  proposalViewOptions,
  type ProposalView,
} from '../vendor-requests.utils';

type VendorRequestItem = VendorRequestFeedListResponse['items'][number];

interface VendorRequestFeedCardProps {
  currentPage: number;
  proposalView: ProposalView;
  requestItems: VendorRequestItem[];
  resultSummary: string;
  search: string;
  summary: {
    total: number;
    needs_proposal: number;
    sent: number;
  };
  totalPages: number;
  verificationDescription: string;
  verificationReady: boolean;
  isLoadingSummary: boolean;
  isLoadingFeed: boolean;
  isFeedError: boolean;
  onApplyProposalView: (view: ProposalView) => void;
  onSearchChange: (value: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function VendorRequestFeedCard({
  currentPage,
  proposalView,
  requestItems,
  resultSummary,
  search,
  summary,
  totalPages,
  verificationDescription,
  verificationReady,
  isLoadingSummary,
  isLoadingFeed,
  isFeedError,
  onApplyProposalView,
  onSearchChange,
  onPreviousPage,
  onNextPage,
}: VendorRequestFeedCardProps) {
  return (
    <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <Search className="size-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search website development, cybersecurity, licensing..."
            className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {proposalViewOptions.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onApplyProposalView(filter.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                proposalView === filter.value
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

      {isLoadingSummary ? (
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-[24px]" />
          <Skeleton className="h-44 rounded-[24px]" />
        </div>
      ) : !verificationReady ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="Finish verification before matched requests open"
          description={verificationDescription}
          action={
            <Link
              href="/dashboard/vendor-verification"
              className="w-full sm:w-auto"
            >
              <Button className="w-full sm:w-auto">
                Continue to verification
              </Button>
            </Link>
          }
        />
      ) : isLoadingFeed ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-[24px]" />
          ))}
        </div>
      ) : isFeedError ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="Requests are not loading right now"
          description="Refresh and try again in a moment."
        />
      ) : !requestItems.length ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title={
            summary.total ? 'No requests match this view' : 'No matched requests yet'
          }
          description={
            summary.total
              ? 'Try another search or switch the filter.'
              : 'WOLFIX may still be matching your capability lanes. Check again soon.'
          }
          action={
            <Link href="/dashboard/vendor" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Open workspace</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {requestItems.map((request) => {
            const laneInsight = getVendorRequestMatchInsight(
              request.service_type.group_slug,
              request.service_type.group_title,
            );

            return (
              <div
                key={request.id}
                className="grid gap-4 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,252,0.92)] p-5 lg:grid-cols-[minmax(0,1.1fr)_260px_210px]"
              >
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
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {laneInsight.fitSummary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {request.deadline_note ? (
                      <StatusBadge
                        label={`Timing: ${request.deadline_note}`}
                        tone="info"
                      />
                    ) : null}
                    {request.budget_note ? (
                      <StatusBadge
                        label={`Budget: ${request.budget_note}`}
                        tone="neutral"
                      />
                    ) : null}
                    {request.interest ? (
                      <StatusBadge label="Proposal sent" tone="success" />
                    ) : (
                      <StatusBadge label="Proposal needed" tone="info" />
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-[var(--line)] bg-white p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                    Your fit
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-[var(--text-primary)]">
                    <p>
                      Experience:{' '}
                      {request.capability.experience_level || 'Not stated yet'}
                    </p>
                    <p>
                      Starting price:{' '}
                      {formatVendorRequestMoney(
                        request.capability.starting_price_minor,
                        'TZS',
                      )}
                    </p>
                    <p>
                      Capacity:{' '}
                      {request.capability.capacity_status || 'Not stated yet'}
                    </p>
                    <p>
                      Turnaround:{' '}
                      {request.capability.turnaround_note || 'Not stated yet'}
                    </p>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-[var(--text-secondary)]">
                    {laneInsight.priceHint}
                  </p>
                </div>

                <div className="flex flex-col items-start justify-between gap-4 lg:items-end">
                  <StatusBadge
                    label={request.interest ? request.interest.status : request.status}
                    tone={getVendorRequestTone(Boolean(request.interest))}
                  />
                  <Link
                    href={`/dashboard/vendor-requests/${request.id}`}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full sm:w-auto">
                      {request.interest ? 'Open proposal' : 'Open request'}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}

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
