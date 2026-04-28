'use client';

import { Skeleton } from '@/components/ui/skeleton';

import type { DashboardBookingsModel } from '../use-dashboard-bookings';
import { DashboardBookingSummaryTiles } from './dashboard-booking-summary-tiles';
import { DashboardBookingsListCard } from './dashboard-bookings-list-card';

interface DashboardBookingsContentProps {
  workspace: DashboardBookingsModel;
}

export function DashboardBookingsContent({
  workspace,
}: DashboardBookingsContentProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {workspace.queries.bookingsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-32 rounded-[24px]"
            />
          ))
        ) : (
          <DashboardBookingSummaryTiles
            activeView={workspace.view}
            isLoading={workspace.queries.bookingsQuery.isLoading}
            summary={workspace.summary}
            onSelectView={workspace.actions.applyView}
          />
        )}
      </div>

      <DashboardBookingsListCard
        bookingItems={workspace.bookingItems}
        currentPage={workspace.currentPage}
        isError={workspace.queries.bookingsQuery.isError}
        isLoading={workspace.queries.bookingsQuery.isLoading}
        search={workspace.search}
        summary={workspace.summary}
        totalPages={workspace.totalPages}
        view={workspace.view}
        onApplyView={workspace.actions.applyView}
        onPreviousPage={workspace.actions.goToPreviousPage}
        onNextPage={workspace.actions.goToNextPage}
        onSearchChange={workspace.actions.setSearch}
      />
    </div>
  );
}
