'use client';

import { AdminOperationsAnalyticsBoard } from '@/components/dashboard/admin-operations-analytics-board';
import { SectionHeader } from '@/components/ui/section-header';
import type {
  AdminMetricsHealth,
  AdminMetricsTrendResponse,
  AdminRiskOverview,
} from '@/lib/types';

interface AdminDashboardAnalyticsSectionProps {
  actionableAccounts: number;
  days: number;
  metrics: AdminMetricsHealth | undefined;
  openDisputes: number;
  riskOverview: AdminRiskOverview | undefined;
  trend: AdminMetricsTrendResponse | undefined;
  onDaysChange: (days: number) => void;
}

export function AdminDashboardAnalyticsSection({
  actionableAccounts,
  days,
  metrics,
  openDisputes,
  riskOverview,
  trend,
  onDaysChange,
}: AdminDashboardAnalyticsSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Visual maps"
        title="Use health, trend, and risk graphics before intervening"
        description="The operations board below turns trend, health, and risk into a clearer intervention surface."
        variant="activity"
      />
      <AdminOperationsAnalyticsBoard
        metrics={metrics}
        trend={trend}
        riskOverview={riskOverview}
        openDisputes={openDisputes}
        actionableAccounts={actionableAccounts}
        days={days}
        onDaysChange={onDaysChange}
      />
    </div>
  );
}
