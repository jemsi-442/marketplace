'use client';

import { Card } from '@/components/ui/card';

interface NotificationSummaryTilesProps {
  filter: 'all' | 'unread';
  total: number;
  unread: number;
  visible: number;
  onApplyReadFilter: (value: 'all' | 'unread') => void;
  onResetVisible: () => void;
}

export function NotificationSummaryTiles({
  filter,
  total,
  unread,
  visible,
  onApplyReadFilter,
  onResetVisible,
}: NotificationSummaryTilesProps) {
  const tiles = [
    { key: 'all', label: 'All alerts', value: total },
    { key: 'unread', label: 'Unread', value: unread },
    { key: 'visible', label: 'Visible', value: visible },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiles.map((tile) => (
        <button
          key={tile.key}
          type="button"
          onClick={
            tile.key === 'visible'
              ? onResetVisible
              : () => onApplyReadFilter(tile.key)
          }
          className={`text-left ${filter === tile.key ? 'translate-y-[-1px]' : ''}`}
        >
          <Card className="rounded-[22px] border border-[rgba(15,23,42,0.08)] p-4 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {tile.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
              {tile.value}
            </p>
          </Card>
        </button>
      ))}
    </div>
  );
}
