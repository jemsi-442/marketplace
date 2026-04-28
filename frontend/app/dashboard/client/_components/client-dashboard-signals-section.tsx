'use client';

import type { ComponentProps } from 'react';

import { DashboardStatGrid } from '@/components/dashboard/dashboard-stat-grid';
import { SectionHeader } from '@/components/ui/section-header';

interface ClientDashboardSignalsSectionProps {
  items: ComponentProps<typeof DashboardStatGrid>['items'];
}

export function ClientDashboardSignalsSection({
  items,
}: ClientDashboardSignalsSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Workspace signals"
        title="Read the four numbers that shape today"
        description="These cards summarize discovery reach, request movement, protection, and payment readiness before you scroll deeper."
        variant="activity"
      />
      <DashboardStatGrid items={items} />
    </div>
  );
}
