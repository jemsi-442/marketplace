'use client';

import { Card } from '@/components/ui/card';

import type { ThreadFilter } from '../communications.utils';

interface CommunicationSummaryTilesProps {
  activeFilter: ThreadFilter;
  summary: {
    total: number;
    requests: number;
    bookings: number;
    unread: number;
  };
  onSelectFilter: (filter: ThreadFilter) => void;
}

const summaryTiles: Array<{
  key: ThreadFilter;
  label: string;
  summaryKey: keyof CommunicationSummaryTilesProps['summary'];
}> = [
  { key: 'all', label: 'All threads', summaryKey: 'total' },
  { key: 'request', label: 'Request threads', summaryKey: 'requests' },
  { key: 'booking', label: 'Booking threads', summaryKey: 'bookings' },
  { key: 'unread', label: 'Unread updates', summaryKey: 'unread' },
];

export function CommunicationSummaryTiles({
  activeFilter,
  summary,
  onSelectFilter,
}: CommunicationSummaryTilesProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {summaryTiles.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={() => onSelectFilter(card.key)}
          className={`text-left ${activeFilter === card.key ? 'translate-y-[-1px]' : ''}`}
        >
          <Card className="rounded-[22px] border border-[rgba(15,23,42,0.08)] p-4 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
              {summary[card.summaryKey]}
            </p>
          </Card>
        </button>
      ))}
    </div>
  );
}
