'use client';

import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AdminVerificationDecisionPanelProps {
  canDownloadResume: boolean;
  isPreparingResumeLink: boolean;
  isReviewPending: boolean;
  reviewNote: string;
  onDownloadResume: () => void;
  onReviewNoteChange: (value: string) => void;
  onApprove: () => void;
  onRevoke: () => void;
}

export function AdminVerificationDecisionPanel({
  canDownloadResume,
  isPreparingResumeLink,
  isReviewPending,
  reviewNote,
  onDownloadResume,
  onReviewNoteChange,
  onApprove,
  onRevoke,
}: AdminVerificationDecisionPanelProps) {
  return (
    <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            Admin decision
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Approve or revoke the blue tick
          </h3>
        </div>

        {canDownloadResume ? (
          <Button
            variant="ghost"
            className="w-full justify-between rounded-[20px] border border-[var(--line)] px-4 py-4"
            onClick={onDownloadResume}
            disabled={isPreparingResumeLink}
          >
            {isPreparingResumeLink ? 'Preparing link' : 'Download resume'}
            <Download className="size-4" />
          </Button>
        ) : null}

        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Admin review note
          </span>
          <textarea
            value={reviewNote}
            onChange={(event) => onReviewNoteChange(event.target.value)}
            rows={5}
            placeholder="Write the reason clearly. If you revoke the badge, explain what proof is still missing."
            className="w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </label>

        <div className="grid gap-3">
          <Button onClick={onApprove} disabled={isReviewPending}>
            {isReviewPending ? 'Saving...' : 'Approve blue tick'}
          </Button>
          <Button
            variant="ghost"
            className="border border-[var(--line)]"
            onClick={onRevoke}
            disabled={isReviewPending}
          >
            Revoke blue tick
          </Button>
        </div>
      </div>
    </Card>
  );
}
