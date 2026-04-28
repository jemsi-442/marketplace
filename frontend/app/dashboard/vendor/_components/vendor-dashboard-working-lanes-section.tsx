'use client';

import type { ComponentProps } from 'react';

import { DashboardWorkingLaneGrid } from '@/components/dashboard/dashboard-working-lane-grid';
import { SectionHeader } from '@/components/ui/section-header';

interface VendorDashboardWorkingLanesSectionProps {
  items: ComponentProps<typeof DashboardWorkingLaneGrid>['items'];
}

export function VendorDashboardWorkingLanesSection({
  items,
}: VendorDashboardWorkingLanesSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Working lanes"
        title="Open only the lane that matches the next studio action"
        description="These entry points are split by setup, verification, delivery, and withdrawal so the studio stays operationally clear."
        variant="guidance"
      />
      <DashboardWorkingLaneGrid items={items} />
    </div>
  );
}
