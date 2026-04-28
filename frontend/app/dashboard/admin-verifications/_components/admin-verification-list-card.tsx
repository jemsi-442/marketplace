'use client';

import { BadgeCheck, Search, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminVendorVerificationListResponse } from '@/lib/types';

import {
  verificationFilterOptions,
  type VerificationFilter,
} from '../admin-verifications.utils';
import { AdminVerificationListItem } from './admin-verification-list-item';

type VerificationItem = AdminVendorVerificationListResponse['items'][number];

interface AdminVerificationListCardProps {
  currentPage: number;
  filter: VerificationFilter;
  isError: boolean;
  isLoading: boolean;
  items: VerificationItem[];
  resultSummary: string;
  search: string;
  totalPages: number;
  onApplyFilter: (filter: VerificationFilter) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onSearchChange: (value: string) => void;
}

export function AdminVerificationListCard({
  currentPage,
  filter,
  isError,
  isLoading,
  items,
  resultSummary,
  search,
  totalPages,
  onApplyFilter,
  onPreviousPage,
  onNextPage,
  onSearchChange,
}: AdminVerificationListCardProps) {
  return (
    <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <Search className="size-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search vendor, email, or headline..."
            className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {verificationFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onApplyFilter(option.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                filter === option.value
                  ? 'border-[var(--brand-primary)] bg-[rgba(59,130,246,0.12)] text-[var(--brand-primary)]'
                  : 'border-[var(--line)] bg-white text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.08)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <InlineStateNote tone="info" message={resultSummary} />
      </div>

      <div className="mt-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-[24px]" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<ShieldCheck className="size-5" />}
            title="Vendor verification records are not loading"
            description="Refresh and try again in a moment."
          />
        ) : !items.length ? (
          <EmptyState
            icon={<BadgeCheck className="size-5" />}
            title="No vendor verification records in this view"
            description="Change the filter or search."
          />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <AdminVerificationListItem key={item.id} item={item} />
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
      </div>
    </Card>
  );
}
