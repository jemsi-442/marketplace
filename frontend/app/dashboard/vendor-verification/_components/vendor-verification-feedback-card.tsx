'use client';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

import type { VendorVerificationFeedbackSummary } from '../vendor-verification.utils';

interface VendorVerificationFeedbackCardProps {
  feedbackSummary: VendorVerificationFeedbackSummary;
}

export function VendorVerificationFeedbackCard({
  feedbackSummary,
}: VendorVerificationFeedbackCardProps) {
  return (
    <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            Interview feedback
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            What helped this score
          </h3>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Strong answers
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
              {feedbackSummary.strong_answers} strong answers
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {feedbackSummary.strength_summary}
            </p>
          </div>
          <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Gaps to tighten
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
              {feedbackSummary.weak_answers} weaker answers
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {feedbackSummary.gap_summary}
            </p>
          </div>
          <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Delivery posture
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
              {feedbackSummary.timeline_strength} timing/detail signals
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {feedbackSummary.generic_flags > 0
                ? `${feedbackSummary.generic_flags} generic-answer flags pulled your score down.`
                : 'No generic-answer flags were found.'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[22px] border border-[var(--line)] bg-white p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Strong proof signals
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {feedbackSummary.strong_signals.length ? (
                feedbackSummary.strong_signals.map((signal) => (
                  <StatusBadge key={signal} label={signal} tone="success" />
                ))
              ) : (
                <StatusBadge label="Add more proof" tone="warning" />
              )}
            </div>
          </div>
          <div className="rounded-[22px] border border-[var(--line)] bg-white p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Signals to strengthen next
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {feedbackSummary.missing_signals.length ? (
                feedbackSummary.missing_signals.map((signal) => (
                  <StatusBadge key={signal} label={signal} tone="warning" />
                ))
              ) : (
                <StatusBadge label="No major proof gap" tone="success" />
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
