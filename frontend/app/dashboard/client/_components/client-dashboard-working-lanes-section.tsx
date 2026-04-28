'use client';

import type { ComponentProps, ReactNode } from 'react';

import { DashboardWorkingLaneGrid } from '@/components/dashboard/dashboard-working-lane-grid';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';

interface ClientDashboardWorkingLanesSectionProps {
  items: ComponentProps<typeof DashboardWorkingLaneGrid>['items'];
  popularLaneButtons: ReactNode;
}

export function ClientDashboardWorkingLanesSection({
  items,
  popularLaneButtons,
}: ClientDashboardWorkingLanesSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Working lanes"
        title="Open only the lane that matches the next step in your client journey"
        description="Each lane below is separated by intent so you can jump directly into the right workflow without context switching."
        variant="guidance"
      />
      <DashboardWorkingLaneGrid items={items} />
      <div>
        <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.98))] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                Popular lanes
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Jump directly into the most-used client request categories.
              </p>
            </div>
            {popularLaneButtons}
          </div>
        </Card>
      </div>
    </div>
  );
}
