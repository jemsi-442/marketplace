import { AnalyticsSectionCard } from '@/components/dashboard/analytics-section-card';
import { AnalyticsKpiCard } from '@/components/dashboard/analytics-kpi-card';
import { MetricsTrendChart } from '@/components/dashboard/metrics-trend-chart';
import { SignalMeterGrid } from '@/components/dashboard/signal-meter-grid';
import { formatCompactNumber } from '@/components/dashboard/chart-utils';
import type { AdminMetricsHealth, AdminMetricsTrendResponse, AdminRiskOverview } from '@/lib/types';

function getHealthSignal(metrics?: AdminMetricsHealth) {
  if (!metrics) {
    return {
      label: 'Waiting for health check',
      chip: 'Syncing',
      chipClasses: 'border-[rgba(148,163,184,0.2)] bg-white text-[var(--text-tertiary)]',
      cardClasses: 'border-[rgba(148,163,184,0.18)] bg-[rgba(248,250,252,0.92)]',
      helper: 'The latest pipeline signal will appear here once the health route responds.',
    };
  }

  if (metrics.status === 'NO_DATA') {
    return {
      label: 'No snapshot yet',
      chip: 'No data',
      chipClasses: 'border-[rgba(245,158,11,0.18)] bg-[rgba(255,251,235,0.96)] text-[var(--accent-amber)]',
      cardClasses: 'border-[rgba(245,158,11,0.2)] bg-[rgba(255,251,235,0.72)]',
      helper: 'Run the first metrics snapshot so this desk can judge freshness and trend movement.',
    };
  }

  if (metrics.is_stale) {
    return {
      label: 'Snapshot needs refresh',
      chip: 'Stale',
      chipClasses: 'border-[rgba(249,115,22,0.18)] bg-[rgba(255,247,237,0.96)] text-[var(--accent-coral)]',
      cardClasses: 'border-[rgba(249,115,22,0.2)] bg-[rgba(255,247,237,0.7)]',
      helper: 'The latest snapshot is older than the configured threshold, so trend cues need a quick check.',
    };
  }

  return {
    label: 'Snapshot pipeline healthy',
    chip: 'Healthy',
    chipClasses: 'border-[rgba(20,184,166,0.18)] bg-[rgba(240,253,250,0.96)] text-[var(--accent-teal)]',
    cardClasses: 'border-[rgba(20,184,166,0.18)] bg-[rgba(240,253,250,0.72)]',
    helper: 'The latest snapshot is fresh enough to trust the desk-level trend and pressure readings.',
  };
}

interface AdminOperationsAnalyticsBoardProps {
  metrics?: AdminMetricsHealth;
  trend?: AdminMetricsTrendResponse;
  riskOverview?: AdminRiskOverview;
  openDisputes: number;
  actionableAccounts: number;
  days: number;
  onDaysChange: (days: number) => void;
}

export function AdminOperationsAnalyticsBoard({
  metrics,
  trend,
  riskOverview,
  openDisputes,
  actionableAccounts,
  days,
  onDaysChange,
}: AdminOperationsAnalyticsBoardProps) {
  const healthSignal = getHealthSignal(metrics);
  const criticalUsers = riskOverview?.summary.critical_users ?? 0;
  const fraudCaptures = riskOverview?.latest_fraud_risks.length ?? 0;
  const trustWatchlist = riskOverview?.vendor_trust_watchlist.length ?? 0;
  const staleThreshold = metrics?.stale_threshold_hours ?? 24;
  const snapshotAge = metrics?.snapshot_age_hours ?? staleThreshold;
  const freshnessPercent = Math.max(0, Math.min(100, Math.round(((staleThreshold - Math.min(snapshotAge, staleThreshold)) / staleThreshold) * 100)));
  const usersMonitored = riskOverview?.summary.users_monitored ?? 0;
  const highRiskUsers = riskOverview?.summary.high_or_critical_users ?? 0;
  const riskDensity = usersMonitored ? Math.round((highRiskUsers / usersMonitored) * 100) : 0;
  const disputePressure = actionableAccounts ? Math.round((openDisputes / Math.max(actionableAccounts, 1)) * 100) : openDisputes > 0 ? 100 : 0;

  return (
    <div className="mt-6 rounded-[30px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-5 shadow-[var(--shadow-panel)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent-cyan)]">Operations analytics</p>
          <h3 className="mt-2 font-display text-2xl tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl">See platform health, dispute load, and risk movement before you intervene</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            This board keeps health signals, risk spikes, revenue movement, and action pressure in one place so the operations desk reads like a control center.
          </p>
          <div className={`mt-4 rounded-[22px] border px-4 py-3 ${healthSignal.cardClasses}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Health signal</p>
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{healthSignal.label}</p>
              </div>
              <div className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.16em] ${healthSignal.chipClasses}`}>
                {healthSignal.chip}
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {metrics?.message ?? healthSignal.helper}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onDaysChange(value)}
              className={
                days === value
                  ? 'rounded-full border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-strong)]'
                  : 'rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] transition hover:border-[rgba(79,70,229,0.18)] hover:text-[var(--text-primary)]'
              }
            >
              {value}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnalyticsKpiCard
              label="Platform health"
              value={healthSignal.chip}
              detail={metrics?.message ?? healthSignal.helper}
              accent={metrics?.is_stale ? 'var(--accent-coral)' : metrics?.status === 'NO_DATA' ? 'var(--accent-amber)' : 'var(--accent-teal)'}
              chip="Pipeline"
              tone={metrics?.is_stale ? 'rgba(249,115,22,0.08)' : metrics?.status === 'NO_DATA' ? 'rgba(245,158,11,0.08)' : 'rgba(20,184,166,0.08)'}
            />
            <AnalyticsKpiCard
              label="Open disputes"
              value={String(openDisputes)}
              detail="Cases still waiting for intervention"
              accent="var(--accent-coral)"
              chip="Cases"
              tone="rgba(255,143,143,0.08)"
            />
            <AnalyticsKpiCard
              label="Critical users"
              value={String(criticalUsers)}
              detail="Highest attention accounts"
              accent="var(--accent-amber)"
              chip="Watch"
              tone="rgba(242,198,109,0.08)"
            />
            <AnalyticsKpiCard
              label="Fraud captures"
              value={String(fraudCaptures)}
              detail="Recent fraud snapshots"
              accent="var(--accent-cyan)"
              chip="Fraud"
              tone="rgba(111,215,255,0.08)"
            />
            <AnalyticsKpiCard
              label="Fees collected"
              value={trend ? formatCompactNumber(trend.summary.total_fees_collected_minor) : '--'}
              detail="Window revenue capture"
              accent="var(--accent-violet)"
              chip="Revenue"
              tone="rgba(188,164,255,0.08)"
            />
            <AnalyticsKpiCard
              label="Trust watchlist"
              value={String(trustWatchlist)}
              detail="Businesses under review"
              accent="var(--accent-cyan)"
              chip="Trust"
              tone="rgba(140,203,255,0.08)"
            />
          </div>

          <AnalyticsSectionCard
            title="Marketplace trend"
            description="Track volume and high-risk escrow movement across the current window."
            chip={`${trend?.window_days ?? days} day window`}
            accent="var(--accent-cyan)"
          >
            <div>
              {trend ? <MetricsTrendChart points={trend.trend} /> : <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 text-sm text-[var(--text-secondary)]">Trend data will appear here once the current window loads.</div>}
            </div>
          </AnalyticsSectionCard>
        </div>

        <SignalMeterGrid
          columnsClassName="grid-cols-1"
          items={[
            {
              label: 'Snapshot freshness',
              value: metrics?.status === 'NO_DATA' ? 0 : freshnessPercent,
              helper: metrics?.status === 'NO_DATA'
                ? 'No snapshot yet. Run the first pipeline capture.'
                : metrics?.snapshot_age_hours !== undefined
                  ? `${metrics.snapshot_age_hours}h since last snapshot`
                  : 'Waiting for snapshot age',
              color: 'var(--accent-teal)',
            },
            {
              label: 'Risk density',
              value: riskDensity,
              helper: usersMonitored ? `${highRiskUsers} of ${usersMonitored} monitored users` : 'Waiting for watchlist density',
              color: 'var(--accent-coral)',
            },
            {
              label: 'Dispute pressure',
              value: Math.min(disputePressure, 100),
              helper: actionableAccounts ? `${actionableAccounts} accounts need attention` : 'Waiting for action queue',
              color: 'var(--accent-amber)',
            },
          ]}
        />
      </div>
    </div>
  );
}
