'use client';

import { Card } from '@/components/ui/card';

interface AdminEscrowSummaryTilesProps {
  currentPage: number;
  isLoading: boolean;
  summary: {
    disputed: number;
  };
  totalPages: number;
}

export function AdminEscrowSummaryTiles({
  currentPage,
  isLoading,
  summary,
  totalPages,
}: AdminEscrowSummaryTilesProps) {
  if (isLoading) {
    return null;
  }

  return (
    <>
      <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Open disputes
        </p>
        <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
          {summary.disputed}
        </p>
      </Card>
      <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Current page
        </p>
        <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
          {currentPage}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Page {currentPage} of {totalPages}
        </p>
      </Card>
    </>
  );
}
