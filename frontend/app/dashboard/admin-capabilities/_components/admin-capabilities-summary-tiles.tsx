'use client';

import { Card } from '@/components/ui/card';

import type { CapabilityFilter } from '../admin-capabilities.utils';

interface AdminCapabilitiesSummaryTilesProps {
  activeFilter: CapabilityFilter;
  summary: {
    total: number;
    pending: number;
    approved: number;
    returned: number;
  };
  onSelectFilter: (filter: CapabilityFilter) => void;
}

const summaryTiles: Array<{
  key: CapabilityFilter;
  label: string;
  summaryKey: keyof AdminCapabilitiesSummaryTilesProps['summary'];
}> = [
  { key: 'all', label: 'Total lanes', summaryKey: 'total' },
  { key: 'pending', label: 'Pending', summaryKey: 'pending' },
  { key: 'approved', label: 'Approved', summaryKey: 'approved' },
  { key: 'returned', label: 'Returned', summaryKey: 'returned' },
];

export function AdminCapabilitiesSummaryTiles({
  activeFilter,
  summary,
  onSelectFilter,
}: AdminCapabilitiesSummaryTilesProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {summaryTiles.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={() => onSelectFilter(card.key)}
          className={`text-left ${activeFilter === card.key ? 'translate-y-[-1px]' : ''}`}
        >
          <Card className="h-full rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
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
