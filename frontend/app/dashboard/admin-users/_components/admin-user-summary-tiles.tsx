'use client';

import { Card } from '@/components/ui/card';

import type { UserFilter } from '../admin-users.utils';

interface AdminUserSummaryTilesProps {
  filter: UserFilter;
  summary: {
    total: number;
    clients: number;
    vendors: number;
    admins: number;
    locked: number;
    unverified: number;
  };
  onApplyFilter: (filter: UserFilter) => void;
}

export function AdminUserSummaryTiles({
  filter,
  summary,
  onApplyFilter,
}: AdminUserSummaryTilesProps) {
  const tiles = [
    { key: 'all' as const, label: 'Total users', value: summary.total },
    { key: 'client' as const, label: 'Clients', value: summary.clients },
    { key: 'vendor' as const, label: 'Vendors', value: summary.vendors },
    { key: 'admin' as const, label: 'Admins', value: summary.admins },
    { key: 'locked' as const, label: 'Locked', value: summary.locked },
    {
      key: 'unverified' as const,
      label: 'Unverified',
      value: summary.unverified,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <button
          key={tile.key}
          type="button"
          onClick={() => onApplyFilter(tile.key)}
          className={`text-left ${filter === tile.key ? 'translate-y-[-1px]' : ''}`}
        >
          <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {tile.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
              {tile.value}
            </p>
          </Card>
        </button>
      ))}
    </div>
  );
}
