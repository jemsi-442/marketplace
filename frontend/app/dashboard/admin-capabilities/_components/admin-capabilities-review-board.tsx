'use client';

import { BriefcaseBusiness, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

import { FILTER_LABELS, type CapabilityFilter } from '../admin-capabilities.utils';
import { AdminCapabilityLaneGroup } from './admin-capability-lane-group';

interface AdminCapabilitiesReviewBoardProps {
  currentPage: number;
  filter: CapabilityFilter;
  groupedItems: Array<{
    lane: string;
    pressureHint: string;
    items: Array<any>;
  }>;
  hasItems: boolean;
  isError: boolean;
  isLoading: boolean;
  search: string;
  totalPages: number;
  onApplyFilter: (filter: CapabilityFilter) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onSearchChange: (value: string) => void;
}

export function AdminCapabilitiesReviewBoard({
  currentPage,
  filter,
  groupedItems,
  hasItems,
  isError,
  isLoading,
  search,
  totalPages,
  onApplyFilter,
  onPreviousPage,
  onNextPage,
  onSearchChange,
}: AdminCapabilitiesReviewBoardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="mb-4 space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            Capability review
          </p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            Open one lane, then review one capability at a time
          </h2>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
          <Search className="size-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search vendor, service, or category"
            className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_LABELS.map((option) => {
            const active = filter === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onApplyFilter(option.value)}
                className={
                  active
                    ? 'rounded-full border border-[rgba(79,70,229,0.18)] bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(79,70,229,0.18)]'
                    : 'rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-[22px]" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<BriefcaseBusiness className="size-5" />}
            title="Capabilities are not loading right now"
            description="Refresh and try again in a moment."
          />
        ) : !hasItems ? (
          <EmptyState
            icon={<BriefcaseBusiness className="size-5" />}
            title="No capabilities in this view"
            description="Change the filter or search."
          />
        ) : (
          <div className="space-y-5">
            {groupedItems.map((group) => (
              <AdminCapabilityLaneGroup
                key={group.lane}
                lane={group.lane}
                pressureHint={group.pressureHint}
                items={group.items}
              />
            ))}
          </div>
        )}
      </div>

      {hasItems ? (
        <div className="mt-6 flex items-center justify-between border-t border-[var(--line)] pt-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              disabled={currentPage <= 1}
              onClick={onPreviousPage}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              disabled={currentPage >= totalPages}
              onClick={onNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
