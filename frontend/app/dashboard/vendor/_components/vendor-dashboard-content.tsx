'use client';

import { DashboardPageSkeleton } from '@/components/dashboard/dashboard-page-skeleton';

import type { VendorDashboardModel } from '../use-vendor-dashboard';
import { VendorDashboardAnalyticsSection } from './vendor-dashboard-analytics-section';
import { VendorDashboardHeroSection } from './vendor-dashboard-hero-section';
import { VendorDashboardSignalsSection } from './vendor-dashboard-signals-section';
import { VendorDashboardWorkingLanesSection } from './vendor-dashboard-working-lanes-section';

interface VendorDashboardContentProps {
  workspace: VendorDashboardModel;
}

export function VendorDashboardContent({
  workspace,
}: VendorDashboardContentProps) {
  if (workspace.isLoading) {
    return <DashboardPageSkeleton sections={2} />;
  }

  return (
    <>
      <VendorDashboardHeroSection
        heroActions={workspace.heroActions}
        pressureItems={workspace.pressureItems}
        summaryItems={workspace.summaryItems}
      />

      <VendorDashboardSignalsSection items={workspace.studioStats} />

      <VendorDashboardAnalyticsSection
        activeStudioLanes={workspace.activeStudioLanes}
        analyticsBookings={workspace.analyticsBookings}
        summary={workspace.summary}
        totalStudioLanes={workspace.totalStudioLanes}
      />

      <VendorDashboardWorkingLanesSection items={workspace.workingLanes} />
    </>
  );
}
