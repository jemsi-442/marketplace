'use client';

import type { ComponentProps } from 'react';

import { DashboardStatGrid } from '@/components/dashboard/dashboard-stat-grid';
import { SectionHeader } from '@/components/ui/section-header';

interface AdminDashboardOperationsSectionProps {
  operationsStats: ComponentProps<typeof DashboardStatGrid>['items'];
}

export function AdminDashboardOperationsSection({
  operationsStats,
}: AdminDashboardOperationsSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Operations signals"
        title="Read the four numbers that shape today"
        description="This signal layer gives the desk a quick read on request flow, approvals, live work, and dispute pressure."
        variant="activity"
      />
      <DashboardStatGrid items={operationsStats} />
    </div>
  );
}
