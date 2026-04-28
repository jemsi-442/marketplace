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

interface VendorStudioAnalyticsBoardProps {
  totalServices: number;
  activeServices: number;
  inactiveServices: number;
  reviewCount: number;
  engagementCount: number;
  activeDeliveryCount: number;
  availableBalance: number;
  currency: string;
  trustScore?: number | null;
  releaseRatio?: number | null;
  bookings: BookingRecord[];
}

export function VendorStudioAnalyticsBoard({
  totalServices,
  activeServices,
  inactiveServices,
  reviewCount,
  engagementCount,
  activeDeliveryCount,
  availableBalance,
  currency,
  trustScore,
  releaseRatio,
  bookings,
}: VendorStudioAnalyticsBoardProps) {
  const reviewBackedLanes = Math.min(reviewCount, activeServices);
  const needsPolishLanes = Math.max(activeServices - reviewBackedLanes, 0);
  const ringRadius = 64;
  const ring = buildRingSegments([
    { label: 'Proof-backed lanes', value: reviewBackedLanes, color: 'var(--accent-teal)' },
    { label: 'Needs polish', value: needsPolishLanes, color: 'var(--accent-amber)' },
    { label: 'Inactive', value: inactiveServices, color: 'var(--accent-coral)' },
  ], ringRadius);

  const laneCoverage = totalServices ? Math.round((activeServices / totalServices) * 100) : 0;
  const reviewCoverage = activeServices ? Math.round((reviewBackedLanes / activeServices) * 100) : 0;
  const deliveryPressure = engagementCount ? Math.round((activeDeliveryCount / engagementCount) * 100) : 0;
  const trendPoints = buildRecentBookingTrendPoints(bookings, 'P');
  const peakValue = Math.max(...trendPoints.map((point) => point.value), 0);
  const signalChips = [
    { label: 'Proof', value: reviewBackedLanes, color: 'var(--accent-teal)' },
    { label: 'Polish', value: needsPolishLanes, color: 'var(--accent-amber)' },
    { label: 'Inactive', value: inactiveServices, color: 'var(--accent-coral)' },
    { label: 'Delivery', value: activeDeliveryCount, color: 'var(--accent-cyan)' },
  ];
  const highlightItems = [
    ['Latest value', trendPoints.length ? formatCompactMoney(trendPoints[trendPoints.length - 1]?.value ?? 0, currency) : '--'],
    ['Peak value', trendPoints.length ? formatCompactMoney(peakValue, currency) : '--'],
    ['Visible balance', formatCompactMoney(availableBalance, currency)],
  ].map(([label, value]) => ({ label, value }));

  return (
    <AnalyticsBoardShell
      eyebrow="Studio analytics"
      title="Read capability health and revenue posture before you edit anything"
      description="This board separates capability quality, delivery pressure, trust, and wallet visibility so the studio feels like a business dashboard instead of one long form."
      snapshotLabel="Current studio snapshot"
      chips={<AnalyticsSnapshotChips items={signalChips} />}
    >
      <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <AnalyticsSectionCard
          title="Capability quality map"
          description="Read proof-backed lanes, polish gaps, and inactive services as one capability stack."
          chip="Signal map"
          accent="var(--accent-teal)"
        >
          <div className="flex items-center justify-center">
            <PremiumRingChart segments={ring.segments} radius={ringRadius} totalLabel={totalServices} totalCaption="lanes" />
          </div>

          <AnalyticsSegmentList items={ring.segments} />
        </AnalyticsSectionCard>

        <div className="space-y-6">
          <AnalyticsHighlightGrid items={highlightItems} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <AnalyticsSectionCard
              title="Recent booking value"
              description="This graph follows the most recent booking amounts already attached to the studio."
              chip="Real booking flow"
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
                    valueFormatter={(value) => formatCompactMoney(value, currency)}
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-[20px] border border-dashed border-[var(--line)] bg-white/72 px-5 text-center text-sm text-[var(--text-secondary)]">
                    Recent booking value will appear here once the studio receives protected work.
                  </div>
                )}
              </div>
            </AnalyticsSectionCard>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <AnalyticsKpiCard
                label="Available balance"
                value={formatCompactMoney(availableBalance, currency)}
                detail="Ready vendor balance"
                accent="var(--accent-teal)"
                chip="Wallet"
                tone="rgba(240,253,250,0.94)"
              />
              <AnalyticsKpiCard
                label="Engagements"
                value={String(engagementCount)}
                detail="Bookings in the studio flow"
                accent="var(--accent-violet)"
                chip="Flow"
                tone="rgba(245,243,255,0.94)"
              />
              <AnalyticsKpiCard
                label="Trust score"
                value={typeof trustScore === 'number' ? String(trustScore) : '--'}
                detail="Marketplace trust posture"
                accent="var(--accent-coral)"
                chip="Trust"
                tone="rgba(255,247,237,0.94)"
              />
              <AnalyticsKpiCard
                label="Release ratio"
                value={typeof releaseRatio === 'number' ? `${Math.round(releaseRatio * 100)}%` : '--'}
                detail="Protected work settled cleanly"
                accent="var(--accent-amber)"
                chip="Settle"
                tone="rgba(255,251,235,0.94)"
              />
            </div>
          </div>

          <SignalMeterGrid
            items={[
              { label: 'Lane coverage', value: laneCoverage, color: 'var(--accent-teal)', helper: `${activeServices} of ${totalServices} service lanes are active.` },
              { label: 'Review coverage', value: reviewCoverage, color: 'var(--accent-amber)', helper: `${reviewBackedLanes} active lanes already have proof behind them.` },
              { label: 'Delivery pressure', value: deliveryPressure, color: 'var(--accent-cyan)', helper: `${activeDeliveryCount} live deliveries are moving across ${engagementCount} engagements.` },
            ]}
          />
        </div>
      </div>
    </AnalyticsBoardShell>
  );
}
