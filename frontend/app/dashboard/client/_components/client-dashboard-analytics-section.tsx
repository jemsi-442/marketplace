'use client';

import type { ClientDashboardSummary } from '@/lib/types';

import { ClientWorkspaceAnalyticsBoard } from '@/components/dashboard/client-workspace-analytics-board';
import { SectionHeader } from '@/components/ui/section-header';

interface ClientDashboardAnalyticsSectionProps {
  data: ClientDashboardSummary;
}

export function ClientDashboardAnalyticsSection({
  data,
}: ClientDashboardAnalyticsSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Visual maps"
        title="Use graphics to read discovery, protection, and value movement faster"
        description="This block turns booking movement into a visual control surface so you can scan status instead of reading tables."
        variant="activity"
      />
      <ClientWorkspaceAnalyticsBoard
        totalServices={Math.max(data.visible_lane_count, 1)}
        categoryResultsCount={data.visible_lane_count}
        trackedBookings={data.tracked_bookings}
        activeDeliveries={data.active_bookings}
        pendingCollections={data.awaiting_payment_requests}
        disputedBookings={data.disputed_bookings}
        bookings={data.recent_bookings ?? []}
      />
    </div>
  );
}
