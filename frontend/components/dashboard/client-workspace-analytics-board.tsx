import {
  buildRecentBookingTrendPoints,
} from '@/components/dashboard/analytics-board-utils';
import { AnalyticsBoardShell } from '@/components/dashboard/analytics-board-shell';
import { AnalyticsHighlightGrid } from '@/components/dashboard/analytics-highlight-grid';
import { AnalyticsSegmentList } from '@/components/dashboard/analytics-segment-list';
import { AnalyticsSectionCard } from '@/components/dashboard/analytics-section-card';
import { AnalyticsSnapshotChips } from '@/components/dashboard/analytics-snapshot-chips';
import { AnalyticsKpiCard } from '@/components/dashboard/analytics-kpi-card';
import type { BookingRecord } from '@/lib/types';
import {
  buildRingSegments,
  formatCompactMoney,
} from '@/components/dashboard/chart-utils';
import { PremiumRingChart } from '@/components/dashboard/premium-ring-chart';
import { SignalMeterGrid } from '@/components/dashboard/signal-meter-grid';
import { TrendStage } from '@/components/dashboard/trend-stage';

interface ClientWorkspaceAnalyticsBoardProps {
  totalServices: number;
  categoryResultsCount: number;
  trackedBookings: number;
  activeDeliveries: number;
  pendingCollections: number;
  disputedBookings: number;
  bookings: BookingRecord[];
}

export function ClientWorkspaceAnalyticsBoard({
  totalServices,
  categoryResultsCount,
  trackedBookings,
  activeDeliveries,
  pendingCollections,
  disputedBookings,
  bookings,
}: ClientWorkspaceAnalyticsBoardProps) {
  const totalBookings = bookings.length;
  const openBookings = Math.max(totalBookings - trackedBookings, 0);
  const ringRadius = 64;
  const ring = buildRingSegments([
    { value: activeDeliveries, color: 'var(--accent-teal)' },
    { value: pendingCollections, color: 'var(--accent-amber)' },
    { value: disputedBookings, color: 'var(--accent-coral)' },
    { value: openBookings, color: 'var(--accent-cyan)' },
  ].map((segment, index) => ({
    ...segment,
    label: ['Active delivery', 'Pending collection', 'Disputes', 'Open planning'][index] ?? `Segment ${index + 1}`,
  })), ringRadius);
  const catalogCoverage = totalServices ? Math.round((categoryResultsCount / totalServices) * 100) : 0;
  const protectedFlow = totalBookings ? Math.round((trackedBookings / totalBookings) * 100) : 0;
  const deliveryPressure = trackedBookings ? Math.round((activeDeliveries / trackedBookings) * 100) : 0;
  const protectedValue = bookings.reduce((sum, booking) => sum + (booking.escrow?.amount_minor ?? 0), 0);
  const trendPoints = buildRecentBookingTrendPoints(bookings, 'B');
  const signalChips = [
    { label: 'Delivery', value: activeDeliveries, color: 'var(--accent-teal)' },
    { label: 'Collection', value: pendingCollections, color: 'var(--accent-amber)' },
    { label: 'Disputes', value: disputedBookings, color: 'var(--accent-coral)' },
    { label: 'Planning', value: openBookings, color: 'var(--accent-cyan)' },
  ];
  const highlightItems = [
    ['Latest value', trendPoints.length ? formatCompactMoney(trendPoints[trendPoints.length - 1]?.value ?? 0) : '--'],
    ['Peak value', trendPoints.length ? formatCompactMoney(Math.max(...trendPoints.map((point) => point.value), 0)) : '--'],
    ['Protected amount', formatCompactMoney(protectedValue)],
  ].map(([label, value]) => ({ label, value }));

  return (
    <AnalyticsBoardShell
      eyebrow="Booking analytics"
      title="See booking pressure, protected flow, and spend movement before you dive into the rail"
      description="This board keeps discovery, payment readiness, live delivery, and disputes visually separate so the workspace reads like a client control desk."
      snapshotLabel="Current booking snapshot"
      chips={<AnalyticsSnapshotChips items={signalChips} />}
    >
      <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <AnalyticsSectionCard
          title="Booking mix"
          description="See how delivery, collection, disputes, and planning are distributed before opening the rail."
          chip="Signal map"
          accent="var(--accent-cyan)"
        >
          <div className="flex items-center justify-center">
            <PremiumRingChart segments={ring.segments} radius={ringRadius} totalLabel={totalBookings} totalCaption="bookings" />
          </div>

          <AnalyticsSegmentList items={ring.segments} />
        </AnalyticsSectionCard>

        <div className="space-y-6">
          <AnalyticsHighlightGrid items={highlightItems} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <AnalyticsSectionCard
              title="Protected value trend"
              description="Recent booking amounts already flowing through the client workspace."
              chip="Live booking flow"
              accent="var(--accent-cyan)"
            >
              <div>
                {trendPoints.length ? (
                  <TrendStage
                    points={trendPoints}
                    accent="var(--accent-cyan)"
                    width={520}
                    height={168}
                    paddingLeft={18}
                    paddingRight={54}
                    paddingTop={18}
                    paddingBottom={28}
                    valueFormatter={(value) => formatCompactMoney(value)}
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-[20px] border border-dashed border-[var(--line)] bg-white/72 px-5 text-center text-sm text-[var(--text-secondary)]">
                    Protected value trend will appear here as soon as booking activity starts moving.
                  </div>
                )}
              </div>
            </AnalyticsSectionCard>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <AnalyticsKpiCard
                label="Lane results"
                value={String(categoryResultsCount)}
                detail="Current visible lanes"
                accent="var(--accent-cyan)"
                chip="Search"
                tone="rgba(240,249,255,0.94)"
              />
              <AnalyticsKpiCard
                label="Tracked bookings"
                value={String(trackedBookings)}
                detail="Protected workflow in view"
                accent="var(--accent-violet)"
                chip="Booked"
                tone="rgba(245,243,255,0.94)"
              />
              <AnalyticsKpiCard
                label="Active delivery"
                value={String(activeDeliveries)}
                detail="Work currently moving"
                accent="var(--accent-teal)"
                chip="Live"
                tone="rgba(240,253,250,0.94)"
              />
              <AnalyticsKpiCard
                label="Protected value"
                value={formatCompactMoney(protectedValue)}
                detail="Recent escrow-linked amount"
                accent="var(--accent-coral)"
                chip="Escrow"
                tone="rgba(255,247,237,0.94)"
              />
            </div>
          </div>

          <SignalMeterGrid
            items={[
              { label: 'Lane coverage', value: catalogCoverage, color: 'var(--accent-cyan)', helper: `${categoryResultsCount} visible results across ${totalServices} available services.` },
              { label: 'Protected flow', value: protectedFlow, color: 'var(--accent-teal)', helper: `${trackedBookings} of ${totalBookings} bookings are already protected.` },
              { label: 'Delivery pressure', value: deliveryPressure, color: 'var(--accent-amber)', helper: `${activeDeliveries} active deliveries are currently pulling attention.` },
            ]}
          />
        </div>
      </div>
    </AnalyticsBoardShell>
  );
}
