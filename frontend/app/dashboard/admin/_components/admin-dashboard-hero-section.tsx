'use client';

import { Waypoints } from 'lucide-react';
import type { ReactNode } from 'react';

import { DashboardActionLinks } from '@/components/dashboard/dashboard-action-links';
import { DashboardHeroBadge } from '@/components/dashboard/dashboard-hero-badge';
import { DashboardHeroSignalPanel } from '@/components/dashboard/dashboard-hero-signal-panel';
import { DashboardOverviewHero } from '@/components/dashboard/dashboard-overview-hero';
import { ActionSummaryStrip } from '@/components/ui/action-summary-strip';
import type { DashboardActionLinkItem } from '@/components/dashboard/dashboard-action-links';
import type { HeroSignalItem } from '@/components/dashboard/dashboard-hero-signal-panel';
import type { ActionSummaryItem } from '@/components/ui/action-summary-strip';

interface AdminDashboardHeroSectionProps {
  heroActions: DashboardActionLinkItem[];
  pressureItems: HeroSignalItem[];
  summaryItems: ActionSummaryItem[];
}

export function AdminDashboardHeroSection({
  heroActions,
  pressureItems,
  summaryItems,
}: AdminDashboardHeroSectionProps) {
  return (
    <DashboardOverviewHero
      className="bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef5ff_100%)]"
      badge={
        <DashboardHeroBadge
          icon={<Waypoints className="size-3.5" />}
          label="Operations board"
          className="border-[rgba(56,189,248,0.18)] text-[var(--accent-cyan)]"
        />
      }
      title="See platform pressure before you open any control lane."
      description="Requests, vendor readiness, disputes, and risk stay in one place."
      summary={
        <ActionSummaryStrip
          title="What needs attention next"
          items={summaryItems}
        />
      }
      aside={
        <>
          <DashboardHeroSignalPanel
            title="Desk pressure"
            items={pressureItems}
          />

          <DashboardActionLinks
            columnsClassName="sm:grid-cols-2 xl:grid-cols-1"
            items={heroActions}
          />
        </>
      }
    />
  );
}
