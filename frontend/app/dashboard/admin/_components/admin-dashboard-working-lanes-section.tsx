'use client';

import type { ComponentProps } from 'react';

import { DashboardWorkingLaneGrid } from '@/components/dashboard/dashboard-working-lane-grid';
import { SectionHeader } from '@/components/ui/section-header';

interface AdminDashboardWorkingLanesSectionProps {
  items: ComponentProps<typeof DashboardWorkingLaneGrid>['items'];
}

export function AdminDashboardWorkingLanesSection({
  items,
}: AdminDashboardWorkingLanesSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Working lanes"
        title="Open only the control lane that matches the next desk action"
        description="These entry points separate review, monitoring, approvals, and intervention so the operations desk stays intentional."
        variant="guidance"
      />
      <DashboardWorkingLaneGrid items={items} />
    </div>
  );
}
