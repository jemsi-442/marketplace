'use client';

import { MessagesSquare, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { ThreadSummaryRecord } from '@/lib/types';

import type { ThreadFilter } from '../communications.utils';
import { ThreadListItem } from './thread-list-item';

interface CommunicationsThreadsPanelProps {
  currentPage: number;
  isLoading: boolean;
  items: ThreadSummaryRecord[];
  search: string;
  selectedThreadKey: string | null;
  threadFilter: ThreadFilter;
  totalPages: number;
  onApplyFilter: (filter: ThreadFilter) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onSearchChange: (value: string) => void;
  onSelectThread: (threadKey: string) => void;
}

const threadFilterOptions: Array<{ value: ThreadFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'request', label: 'Requests' },
  { value: 'booking', label: 'Bookings' },
  { value: 'unread', label: 'Unread' },
];

export function CommunicationsThreadsPanel({
  currentPage,
  isLoading,
  items,
  search,
  selectedThreadKey,
  threadFilter,
  totalPages,
  onApplyFilter,
  onPreviousPage,
  onNextPage,
  onSearchChange,
  onSelectThread,
}: CommunicationsThreadsPanelProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          Threads
        </p>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
          Choose a thread
        </h2>
      </div>
      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
          <Search className="size-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search inbox"
            className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {threadFilterOptions.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onApplyFilter(filter.value)}
              className={
                threadFilter === filter.value
                  ? 'rounded-full border border-[var(--brand-primary)] bg-[rgba(59,130,246,0.12)] px-4 py-2 text-sm font-medium text-[var(--brand-primary)]'
                  : 'rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)]'
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
        {isLoading && !items.length ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState
            icon={<MessagesSquare className="size-5" />}
            title="No thread matches this view"
            description="Try another filter."
          />
        ) : (
          <>
            {items.map((item) => (
              <ThreadListItem
                key={`${item.kind}:${item.id}`}
                item={item}
                isSelected={`${item.kind}:${item.id}` === selectedThreadKey}
                onSelect={onSelectThread}
              />
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
          </>
        )}
      </div>
    </Card>
  );
}
