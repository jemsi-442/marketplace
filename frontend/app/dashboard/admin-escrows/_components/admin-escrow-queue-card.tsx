'use client';

import { Search, ShieldCheck } from 'lucide-react';

import { AdminEscrowRow } from './admin-escrow-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { PendingEscrowAction } from '../admin-escrows.utils';
import type { AdminEscrowListResponse } from '@/lib/types';

type EscrowItem = AdminEscrowListResponse['items'][number];

interface AdminEscrowQueueCardProps {
  currentPage: number;
  evidenceSummaries: Record<number, string>;
  isLoading: boolean;
  items: EscrowItem[];
  pendingActions: Record<number, PendingEscrowAction>;
  resolutionNotes: Record<number, string>;
  search: string;
  tagInputs: Record<number, string>;
  totalPages: number;
  onEvidenceSummaryChange: (escrowId: number, value: string) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onResolve: (escrowId: number, releaseToVendor: boolean) => void;
  onResolutionNoteChange: (escrowId: number, value: string) => void;
  onSearchChange: (value: string) => void;
  onTagInputChange: (escrowId: number, value: string) => void;
}

export function AdminEscrowQueueCard({
  currentPage,
  evidenceSummaries,
  isLoading,
  items,
  pendingActions,
  resolutionNotes,
  search,
  tagInputs,
  totalPages,
  onEvidenceSummaryChange,
  onNextPage,
  onPreviousPage,
  onResolve,
  onResolutionNoteChange,
  onSearchChange,
  onTagInputChange,
}: AdminEscrowQueueCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          Dispute queue
        </p>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          Open one escrow at a time
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
          <Search className="size-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by reference or participant email"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-[24px]" />
            ))}
          </div>
        ) : items.length ? (
          <div className="space-y-4">
            {items.map((escrow) => (
              <AdminEscrowRow
                key={escrow.id}
                escrow={escrow}
                resolutionNote={resolutionNotes[escrow.id] ?? ''}
                evidenceSummary={evidenceSummaries[escrow.id] ?? ''}
                tagInput={tagInputs[escrow.id] ?? ''}
                pendingAction={pendingActions[escrow.id]}
                onResolutionNoteChange={(value) =>
                  onResolutionNoteChange(escrow.id, value)
                }
                onEvidenceSummaryChange={(value) =>
                  onEvidenceSummaryChange(escrow.id, value)
                }
                onTagInputChange={(value) => onTagInputChange(escrow.id, value)}
                onResolve={(releaseToVendor) =>
                  onResolve(escrow.id, releaseToVendor)
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ShieldCheck className="size-5" />}
            title="No disputes in this view"
            description={
              search.trim()
                ? 'Try a different reference or participant email.'
                : 'Disputed escrows will appear here when they need an admin decision.'
            }
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onPreviousPage}
            disabled={currentPage <= 1 || isLoading}
            className="border border-[var(--line)]"
          >
            Previous
          </Button>
          <p className="text-sm text-[var(--text-secondary)]">
            Page {currentPage} of {totalPages}
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={onNextPage}
            disabled={currentPage >= totalPages || isLoading}
            className="border border-[var(--line)]"
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
