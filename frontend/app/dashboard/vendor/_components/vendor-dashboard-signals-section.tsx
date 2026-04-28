'use client';

import type { ComponentProps } from 'react';

import { DashboardStatGrid } from '@/components/dashboard/dashboard-stat-grid';
import { SectionHeader } from '@/components/ui/section-header';

interface VendorDashboardSignalsSectionProps {
  items: ComponentProps<typeof DashboardStatGrid>['items'];
}

export function VendorDashboardSignalsSection({
  items,
}: VendorDashboardSignalsSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Studio signals"
        title="Read the four numbers that shape today"
        description="This first signal row lets you read lane readiness, demand, active work, and payout state in one scan."
        variant="default"
      />
      <DashboardStatGrid items={items} />
    </div>
  );
}
