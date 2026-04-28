'use client';

import { Waypoints } from 'lucide-react';
import type { ComponentProps } from 'react';

import { DashboardActionLinks } from '@/components/dashboard/dashboard-action-links';
import { DashboardHeroBadge } from '@/components/dashboard/dashboard-hero-badge';
import { DashboardHeroSignalPanel } from '@/components/dashboard/dashboard-hero-signal-panel';
import { DashboardOverviewHero } from '@/components/dashboard/dashboard-overview-hero';
import { ActionSummaryStrip } from '@/components/ui/action-summary-strip';

interface VendorDashboardHeroSectionProps {
  heroActions: ComponentProps<typeof DashboardActionLinks>['items'];
  pressureItems: ComponentProps<typeof DashboardHeroSignalPanel>['items'];
  summaryItems: ComponentProps<typeof ActionSummaryStrip>['items'];
}

export function VendorDashboardHeroSection({
  heroActions,
  pressureItems,
  summaryItems,
}: VendorDashboardHeroSectionProps) {
  return (
    <DashboardOverviewHero
      className="bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_38%),linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef5ff_100%)]"
      gridClassName="xl:grid-cols-[minmax(0,1.3fr)_360px]"
      badge={(
        <DashboardHeroBadge
          icon={<Waypoints className="size-3.5" />}
          label="Studio dashboard"
          className="border-[rgba(99,102,241,0.14)] bg-white/80 text-[var(--brand-primary)]"
        />
      )}
      title="Keep lanes visible, work protected, and payouts moving."
      description="See approved lanes, waiting work, and protected delivery in one place."
      summary={(
        <ActionSummaryStrip
          title="What needs attention next"
          items={summaryItems}
        />
      )}
      aside={(
        <>
          <DashboardHeroSignalPanel
            title="Studio pressure"
            items={pressureItems}
          />

          <DashboardActionLinks
            columnsClassName="sm:grid-cols-2 xl:grid-cols-1"
            items={heroActions}
          />
        </>
      )}
    />
  );
}
