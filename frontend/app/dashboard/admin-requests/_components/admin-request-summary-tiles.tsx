'use client';

import { Card } from '@/components/ui/card';

import type { AdminRequestStatusView } from '../admin-requests.utils';

interface AdminRequestSummaryTilesProps {
  activeView: AdminRequestStatusView;
  summary: {
    total: number;
    open: number;
    needs_review: number;
    awaiting_payment: number;
  };
  onSelectView: (view: AdminRequestStatusView) => void;
}

const summaryTiles: Array<{
  key: AdminRequestStatusView;
  label: string;
  summaryKey: keyof AdminRequestSummaryTilesProps['summary'];
}> = [
  { key: 'all', label: 'All requests', summaryKey: 'total' },
  { key: 'needs_review', label: 'Needs review', summaryKey: 'needs_review' },
  {
    key: 'awaiting_payment',
    label: 'Awaiting payment',
    summaryKey: 'awaiting_payment',
  },
];

export function AdminRequestSummaryTiles({
  activeView,
  summary,
  onSelectView,
}: AdminRequestSummaryTilesProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {summaryTiles.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={() => onSelectView(card.key)}
          className={`text-left ${activeView === card.key ? 'translate-y-[-1px]' : ''}`}
        >
          <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
              {summary[card.summaryKey]}
            </p>
          </Card>
        </button>
      ))}
    </div>
  );
}
