'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { RequestReviewInsight } from '@/lib/services/request-review-insights';
import type { AdminVendorInterestRecord } from '@/lib/types';

interface AdminRequestFinalUpdateCardProps {
  adminAssignmentNote: string;
  agreedPriceTzs: string;
  agreedTimelineNote: string;
  assignPending: boolean;
  laneInsight: RequestReviewInsight;
  selectedInterest: AdminVendorInterestRecord | null;
  selectedInterestId: number | null;
  onAdminAssignmentNoteChange: (value: string) => void;
  onAgreedPriceChange: (value: string) => void;
  onAgreedTimelineChange: (value: string) => void;
  onAssignRequest: () => void;
}

export function AdminRequestFinalUpdateCard({
  adminAssignmentNote,
  agreedPriceTzs,
  agreedTimelineNote,
  assignPending,
  laneInsight,
  selectedInterest,
  selectedInterestId,
  onAdminAssignmentNoteChange,
  onAgreedPriceChange,
  onAgreedTimelineChange,
  onAssignRequest,
}: AdminRequestFinalUpdateCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Final platform update
      </p>
      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
        {selectedInterest
          ? `Selected proposal: ${selectedInterest.vendor.company_name || selectedInterest.vendor.email}.`
          : 'Choose one proposal before sending the update.'}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="text-sm font-medium text-[var(--text-primary)]"
            htmlFor="agreed-price"
          >
            Agreed price
          </label>
          <input
            id="agreed-price"
            type="number"
            min="1"
            step="1"
            value={agreedPriceTzs}
            onChange={(event) => onAgreedPriceChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
            placeholder="Enter amount in TZS"
          />
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Use normal TZS, for example `250000`.
          </p>
        </div>
        <div>
          <label
            className="text-sm font-medium text-[var(--text-primary)]"
            htmlFor="agreed-timeline"
          >
            Agreed timeline
          </label>
          <input
            id="agreed-timeline"
            type="text"
            value={agreedTimelineNote}
            onChange={(event) => onAgreedTimelineChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
            placeholder={laneInsight.timelinePlaceholder}
          />
        </div>
      </div>
      <div className="mt-4">
        <label
          className="text-sm font-medium text-[var(--text-primary)]"
          htmlFor="admin-assignment-note"
        >
          Platform note
        </label>
        <textarea
          id="admin-assignment-note"
          value={adminAssignmentNote}
          onChange={(event) => onAdminAssignmentNoteChange(event.target.value)}
          placeholder={laneInsight.adminAssignmentPlaceholder}
          className="mt-2 min-h-[110px] w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          onClick={onAssignRequest}
          disabled={assignPending || !selectedInterestId}
        >
          {assignPending ? 'Sending update...' : 'Assign selected path'}
        </Button>
      </div>
    </Card>
  );
}
