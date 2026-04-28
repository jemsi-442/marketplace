'use client';

import { DashboardPageSkeleton } from '@/components/dashboard/dashboard-page-skeleton';

import type { ClientDashboardModel } from '../use-client-dashboard';
import { ClientDashboardAnalyticsSection } from './client-dashboard-analytics-section';
import { ClientDashboardHeroSection } from './client-dashboard-hero-section';
import { ClientDashboardSignalsSection } from './client-dashboard-signals-section';
import { ClientDashboardWorkingLanesSection } from './client-dashboard-working-lanes-section';

interface ClientDashboardContentProps {
  workspace: ClientDashboardModel;
}

export function ClientDashboardContent({
  workspace,
}: ClientDashboardContentProps) {
  if (workspace.isLoading) {
    return <DashboardPageSkeleton sections={2} />;
  }

  return (
    <>
      <ClientDashboardHeroSection
        heroActions={workspace.heroActions}
        pressureItems={workspace.pressureItems}
        summaryItems={workspace.summaryItems}
      />

      <ClientDashboardSignalsSection items={workspace.workspaceStats} />

      <ClientDashboardAnalyticsSection data={workspace.data} />

      <ClientDashboardWorkingLanesSection
        items={workspace.workingLanes}
        popularLaneButtons={workspace.popularLaneButtons}
      />
    </>
  );
}
