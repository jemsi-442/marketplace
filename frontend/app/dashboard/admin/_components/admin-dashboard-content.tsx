'use client';

import { DashboardPageSkeleton } from '@/components/dashboard/dashboard-page-skeleton';

import type { AdminDashboardModel } from '../use-admin-dashboard';
import { AdminDashboardAnalyticsSection } from './admin-dashboard-analytics-section';
import { AdminDashboardHeroSection } from './admin-dashboard-hero-section';
import { AdminDashboardOperationsSection } from './admin-dashboard-operations-section';
import { AdminDashboardRuntimeSection } from './admin-dashboard-runtime-section';
import { AdminDashboardWorkingLanesSection } from './admin-dashboard-working-lanes-section';

interface AdminDashboardContentProps {
  workspace: AdminDashboardModel;
}

export function AdminDashboardContent({
  workspace,
}: AdminDashboardContentProps) {
  if (workspace.isLoading) {
    return <DashboardPageSkeleton sections={3} />;
  }

  return (
    <>
      <AdminDashboardHeroSection
        heroActions={workspace.heroActions}
        pressureItems={workspace.pressureItems}
        summaryItems={workspace.summaryItems}
      />

      <AdminDashboardOperationsSection
        operationsStats={workspace.operationsStats}
      />

      <AdminDashboardRuntimeSection
        metricsHealth={workspace.metricsHealth.data}
        opsOverview={workspace.opsOverview.data}
      />

      <AdminDashboardAnalyticsSection
        actionableAccounts={workspace.criticalUsers + workspace.trustWatchlist}
        days={workspace.days}
        metrics={workspace.metricsHealth.data}
        openDisputes={workspace.data.disputes}
        riskOverview={workspace.riskOverview.data}
        trend={workspace.metricsTrend.data}
        onDaysChange={workspace.setDays}
      />

      <AdminDashboardWorkingLanesSection items={workspace.workingLanes} />
    </>
  );
}
