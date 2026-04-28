'use client';

import { Card } from '@/components/ui/card';

import {
  getDashboardBookingSummaryCards,
  type DashboardBookingView,
} from '../dashboard-bookings.utils';

interface DashboardBookingSummaryTilesProps {
  activeView: DashboardBookingView;
  isLoading: boolean;
  summary: {
    total: number;
    active: number;
    protected: number;
    unread: number;
  };
  onSelectView: (view: DashboardBookingView) => void;
}

export function DashboardBookingSummaryTiles({
  activeView,
  isLoading,
  summary,
  onSelectView,
}: DashboardBookingSummaryTilesProps) {
  if (isLoading) {
    return null;
  }

  return (
    <>
      {getDashboardBookingSummaryCards(summary).map((item) => (
        <button
          key={item.view}
          type="button"
          onClick={() => onSelectView(item.view)}
          className={`text-left ${activeView === item.view ? 'translate-y-[-1px]' : ''}`}
        >
          <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
              {item.value}
            </p>
          </Card>
        </button>
      ))}
    </>
  );
}
