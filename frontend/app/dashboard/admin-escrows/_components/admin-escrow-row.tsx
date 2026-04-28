import { ShieldCheck, ShieldX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { getEscrowStatusTone } from '@/lib/status';
import type { DisputedEscrowRecord } from '@/lib/types';

import {
  formatBuyerMoney,
  formatEscrowOpenedAt,
  type PendingEscrowAction,
} from '../admin-escrows.utils';

interface AdminEscrowRowProps {
  escrow: DisputedEscrowRecord;
  resolutionNote: string;
  evidenceSummary: string;
  tagInput: string;
  pendingAction: PendingEscrowAction;
  onResolutionNoteChange: (value: string) => void;
  onEvidenceSummaryChange: (value: string) => void;
  onTagInputChange: (value: string) => void;
  onResolve: (releaseToVendor: boolean) => void;
}

export function AdminEscrowRow({
  escrow,
  resolutionNote,
  evidenceSummary,
  tagInput,
  pendingAction,
  onResolutionNoteChange,
  onEvidenceSummaryChange,
  onTagInputChange,
  onResolve,
}: AdminEscrowRowProps) {
  const rowIsPending = Boolean(pendingAction);

  return (
    <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-lg font-semibold text-[var(--text-primary)]">{escrow.reference}</p>
            <StatusBadge label={escrow.status} tone={getEscrowStatusTone(escrow.status)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Client</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{escrow.client_label}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Vendor</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{escrow.vendor_label}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Amount</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{formatBuyerMoney(escrow.amount_minor, escrow.currency)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Opened</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{formatEscrowOpenedAt(escrow.disputed_at)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Client dispute note</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {escrow.dispute_reason?.trim() ? escrow.dispute_reason : 'The client opened this dispute without a detailed note.'}
            </p>
            {escrow.dispute_source ? (
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">Source: {escrow.dispute_source}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 lg:w-[360px]">
          <textarea
            value={resolutionNote}
            onChange={(event) => onResolutionNoteChange(event.target.value)}
            rows={4}
            placeholder="Resolution note for the final decision"
            disabled={rowIsPending}
            className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
          />
          <input
            value={evidenceSummary}
            onChange={(event) => onEvidenceSummaryChange(event.target.value)}
            placeholder="Evidence summary"
            disabled={rowIsPending}
            className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
          />
          <input
            value={tagInput}
            onChange={(event) => onTagInputChange(event.target.value)}
            placeholder="Tags, separated by commas"
            disabled={rowIsPending}
            className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
          />
          {rowIsPending ? (
            <p className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              {pendingAction === 'release'
                ? 'Resolving this dispute in favor of the vendor...'
                : 'Processing the client refund resolution...'}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Button onClick={() => onResolve(true)} disabled={rowIsPending} className="justify-between">
              {pendingAction === 'release' ? 'Releasing...' : 'Release to vendor'}
              <ShieldCheck className="size-4" />
            </Button>
            <Button variant="ghost" onClick={() => onResolve(false)} disabled={rowIsPending} className="justify-between border border-[var(--line)]">
              {pendingAction === 'refund' ? 'Refunding...' : 'Refund client'}
              <ShieldX className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
