'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AdminCapabilityReviewDecisionCardProps {
  decisionCopy: string;
  isPending: boolean;
  notePlaceholder: string;
  reviewNote: string;
  onReviewNoteChange: (value: string) => void;
  onApprove: () => void;
  onReturn: () => void;
}

export function AdminCapabilityReviewDecisionCard({
  decisionCopy,
  isPending,
  notePlaceholder,
  reviewNote,
  onReviewNoteChange,
  onApprove,
  onReturn,
}: AdminCapabilityReviewDecisionCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Review decision
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
        Approve or return this lane
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
        {decisionCopy}
      </p>

      <div className="mt-5 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Admin note
        </label>
        <textarea
          value={reviewNote}
          onChange={(event) => onReviewNoteChange(event.target.value)}
          className="mt-3 min-h-[160px] w-full rounded-[18px] border border-[var(--line)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
          placeholder={notePlaceholder}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button onClick={onApprove} disabled={isPending}>
          {isPending ? 'Saving review...' : 'Approve capability'}
        </Button>
        <Button
          variant="ghost"
          className="border border-[var(--line)]"
          onClick={onReturn}
          disabled={isPending}
        >
          {isPending ? 'Saving review...' : 'Return for changes'}
        </Button>
      </div>
    </Card>
  );
}
