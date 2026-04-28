'use client';

import type { BookingRecord, VendorDashboardSummary } from '@/lib/types';

import { VendorStudioAnalyticsBoard } from '@/components/dashboard/vendor-studio-analytics-board';
import { SectionHeader } from '@/components/ui/section-header';

interface VendorDashboardAnalyticsSectionProps {
  activeStudioLanes: number;
  analyticsBookings: BookingRecord[];
  summary: VendorDashboardSummary;
  totalStudioLanes: number;
}

export function VendorDashboardAnalyticsSection({
  activeStudioLanes,
  analyticsBookings,
  summary,
  totalStudioLanes,
}: VendorDashboardAnalyticsSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Visual maps"
        title="Use graphics to see readiness and work pressure faster"
        description="The studio board below turns capability, trust, value, and delivery movement into a readable business cockpit."
        variant="default"
      />
      <VendorStudioAnalyticsBoard
        totalServices={Math.max(totalStudioLanes, 1)}
        activeServices={Math.max(activeStudioLanes, 0)}
        inactiveServices={summary.returned_capabilities}
        reviewCount={summary.approved_capabilities}
        engagementCount={summary.active_bookings}
        activeDeliveryCount={summary.protected_bookings}
        availableBalance={summary.available_balance_minor}
        currency={summary.currency}
        trustScore={null}
        releaseRatio={summary.active_bookings ? summary.protected_bookings / summary.active_bookings : null}
        bookings={analyticsBookings}
      />
    </div>
  );
}
