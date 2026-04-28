'use client';

import { Waypoints } from 'lucide-react';
import type { ComponentProps } from 'react';

import { DashboardActionLinks } from '@/components/dashboard/dashboard-action-links';
import { DashboardHeroBadge } from '@/components/dashboard/dashboard-hero-badge';
import { DashboardHeroSignalPanel } from '@/components/dashboard/dashboard-hero-signal-panel';
import { DashboardOverviewHero } from '@/components/dashboard/dashboard-overview-hero';
import { ActionSummaryStrip } from '@/components/ui/action-summary-strip';

interface ClientDashboardHeroSectionProps {
  heroActions: ComponentProps<typeof DashboardActionLinks>['items'];
  pressureItems: ComponentProps<typeof DashboardHeroSignalPanel>['items'];
  summaryItems: ComponentProps<typeof ActionSummaryStrip>['items'];
}

export function ClientDashboardHeroSection({
  heroActions,
  pressureItems,
  summaryItems,
}: ClientDashboardHeroSectionProps) {
  return (
    <DashboardOverviewHero
      className="bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eefcff_100%)]"
      badge={
        <DashboardHeroBadge
          icon={<Waypoints className="size-3.5" />}
          label="Client workspace"
          className="border-[rgba(56,189,248,0.18)] text-[var(--accent-cyan)]"
        />
      }
      title="Discover the right lanes and track protected work clearly."
      description="Discovery, requests, payments, and bookings stay in one place."
      summary={
        <ActionSummaryStrip
          title="What needs attention next"
          items={summaryItems}
        />
      }
      aside={
        <>
          <DashboardHeroSignalPanel
            title="Workspace pressure"
            items={pressureItems}
          />

          <DashboardActionLinks
            columnsClassName="sm:grid-cols-2"
            items={heroActions}
          />
        </>
      }
    />
  );
}
