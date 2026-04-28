'use client';

import { Card } from '@/components/ui/card';

import { type ClientRequestStatusView } from '../requests.utils';

interface ClientRequestSummaryTilesProps {
  activeView: ClientRequestStatusView;
  summary: {
    total: number;
    active: number;
    awaiting_payment: number;
    completed: number;
  };
  onSelectView: (view: ClientRequestStatusView) => void;
}

const summaryTiles: Array<{
  value: ClientRequestStatusView;
  label: string;
  summaryKey: keyof ClientRequestSummaryTilesProps['summary'];
}> = [
  { value: 'all', label: 'All requests', summaryKey: 'total' },
  { value: 'active', label: 'Active', summaryKey: 'active' },
  {
    value: 'awaiting_payment',
    label: 'Awaiting payment',
    summaryKey: 'awaiting_payment',
  },
  { value: 'completed', label: 'Completed', summaryKey: 'completed' },
];

export function ClientRequestSummaryTiles({
  activeView,
  summary,
  onSelectView,
}: ClientRequestSummaryTilesProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {summaryTiles.map((tile) => (
        <button
          key={tile.value}
          type="button"
          onClick={() => onSelectView(tile.value)}
          className={`text-left ${activeView === tile.value ? 'translate-y-[-1px]' : ''}`}
        >
          <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {tile.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
              {summary[tile.summaryKey]}
            </p>
          </Card>
        </button>
      ))}
    </div>
  );
}
