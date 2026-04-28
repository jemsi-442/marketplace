'use client';

import { Card } from '@/components/ui/card';

import { type VerificationFilter } from '../admin-verifications.utils';

interface AdminVerificationSummaryTilesProps {
  activeFilter: VerificationFilter;
  summary: {
    total: number;
    ready_review: number;
    badge_active: number;
    needs_revision: number;
    missing_resume: number;
  };
  onSelectFilter: (filter: VerificationFilter) => void;
}

const summaryTiles: Array<{
  value: VerificationFilter;
  label: string;
  summaryKey: keyof AdminVerificationSummaryTilesProps['summary'];
}> = [
  { value: 'all', label: 'Total vendors', summaryKey: 'total' },
  { value: 'ready_review', label: 'Ready review', summaryKey: 'ready_review' },
  {
    value: 'badge_active',
    label: 'Blue tick active',
    summaryKey: 'badge_active',
  },
  {
    value: 'needs_revision',
    label: 'Needs revision',
    summaryKey: 'needs_revision',
  },
];

export function AdminVerificationSummaryTiles({
  activeFilter,
  summary,
  onSelectFilter,
}: AdminVerificationSummaryTilesProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {summaryTiles.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onSelectFilter(item.value)}
          className={`text-left ${activeFilter === item.value ? 'translate-y-[-1px]' : ''}`}
        >
          <Card className="h-full rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
              {summary[item.summaryKey]}
            </p>
          </Card>
        </button>
      ))}
    </div>
  );
}
