'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { VendorRequestFeedRecord } from '@/lib/types';

import { formatVendorRequestDetailDateTime } from '../vendor-request-detail.utils';

interface VendorRequestProposalCardProps {
  adminNoteHint: string;
  isSubmittingProposal: boolean;
  message: string;
  priceHint: string;
  priceReason: string;
  proposedPriceTzs: string;
  request: VendorRequestFeedRecord;
  timelineHint: string;
  timelineNote: string;
  onMessageChange: (value: string) => void;
  onPriceReasonChange: (value: string) => void;
  onProposedPriceChange: (value: string) => void;
  onSubmitProposal: () => void;
  onTimelineNoteChange: (value: string) => void;
}

export function VendorRequestProposalCard({
  adminNoteHint,
  isSubmittingProposal,
  message,
  priceHint,
  priceReason,
  proposedPriceTzs,
  request,
  timelineHint,
  timelineNote,
  onMessageChange,
  onPriceReasonChange,
  onProposedPriceChange,
  onSubmitProposal,
  onTimelineNoteChange,
}: VendorRequestProposalCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Proposal
      </p>
      {request.interest ? (
        <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
          <p>
            <span className="font-medium text-[var(--text-primary)]">
              Status:
            </span>{' '}
            {request.interest.status}
          </p>
          <p>
            <span className="font-medium text-[var(--text-primary)]">
              Submitted:
            </span>{' '}
            {formatVendorRequestDetailDateTime(request.interest.submitted_at)}
          </p>
          <p>Wait for admin review before sending anything else.</p>
        </div>
      ) : (
        <form
          className="mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitProposal();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="text-sm font-medium text-[var(--text-primary)]"
                htmlFor="proposed-price"
              >
                Your price
              </label>
              <input
                id="proposed-price"
                type="number"
                min="1"
                step="1"
                value={proposedPriceTzs}
                onChange={(event) => onProposedPriceChange(event.target.value)}
                placeholder="Enter amount in TZS"
                className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
              />
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Use normal TZS, for example `250000`.
              </p>
            </div>
            <div>
              <label
                className="text-sm font-medium text-[var(--text-primary)]"
                htmlFor="timeline-note"
              >
                Delivery time
              </label>
              <input
                id="timeline-note"
                type="text"
                value={timelineNote}
                onChange={(event) => onTimelineNoteChange(event.target.value)}
                placeholder={timelineHint}
                className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
              />
            </div>
          </div>
          <div>
            <label
              className="text-sm font-medium text-[var(--text-primary)]"
              htmlFor="price-reason"
            >
              Why this price
            </label>
            <textarea
              id="price-reason"
              value={priceReason}
              onChange={(event) => onPriceReasonChange(event.target.value)}
              placeholder={priceHint}
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
            />
          </div>
          <div>
            <label
              className="text-sm font-medium text-[var(--text-primary)]"
              htmlFor="admin-message"
            >
              Extra note for admin
            </label>
            <textarea
              id="admin-message"
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              placeholder={adminNoteHint}
              className="mt-2 min-h-[100px] w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmittingProposal}>
              {isSubmittingProposal ? 'Sending proposal...' : 'Send proposal'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
