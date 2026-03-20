'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChartNoAxesCombined, Shield, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type { AdminMetricsTrendPoint } from '@/lib/types';

function getTrendVolume(point: AdminMetricsTrendPoint): number {
  return typeof point.totalVolumeMinor === 'number' ? point.totalVolumeMinor : 0;
}

function getTrendRisk(point: AdminMetricsTrendPoint): number {
  return typeof point.highRiskEscrowPercentage === 'number' ? point.highRiskEscrowPercentage : 0;
}

function getTrendDate(point: AdminMetricsTrendPoint): string {
  return typeof point.snapshotDate === 'string' ? point.snapshotDate : 'n/a';
}

export default function AdminDashboardPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [days, setDays] = useState(30);
  const [resolutionFeedback, setResolutionFeedback] = useState<string | null>(null);
  const metrics = useQuery({
    queryKey: ['admin-health-page', token],
    queryFn: () => apiClient.getAdminMetricsHealth(token ?? ''),
    enabled: Boolean(token),
  });
  const trend = useQuery({
    queryKey: ['admin-trend-page', token, days],
    queryFn: () => apiClient.getAdminMetricsTrend(token ?? '', days),
    enabled: Boolean(token),
  });
  const disputedEscrows = useQuery({
    queryKey: ['disputed-escrows', token],
    queryFn: () => apiClient.getDisputedEscrows(token ?? ''),
    enabled: Boolean(token),
  });
  const resolveEscrow = useMutation({
    mutationFn: async ({ escrowId, releaseToVendor }: { escrowId: number; releaseToVendor: boolean }) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.resolveEscrow(token, escrowId, releaseToVendor);
    },
    onSuccess: async (response) => {
      setResolutionFeedback(response.message);
      await queryClient.invalidateQueries({ queryKey: ['disputed-escrows'] });
    },
    onError: (error) => {
      setResolutionFeedback(error instanceof Error ? error.message : 'Unable to resolve escrow');
    },
  });

  const maxVolume = Math.max(...(trend.data?.trend.map(getTrendVolume) ?? [1]));

  return (
    <DashboardShell
      title="Admin control"
      subtitle="This area is positioned for platform health, disputes, payouts, fraud telemetry, and revenue oversight across the marketplace network."
    >
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard eyebrow="Platform health" value={metrics.data?.is_healthy ? 'Healthy' : metrics.data?.status ?? 'Review'} detail={metrics.data ? metrics.data.message : 'Sign in as admin to query live metrics health.'} icon={<Shield className="size-8" />} />
        <StatCard eyebrow="Snapshot age" value={metrics.data?.snapshot_age_hours !== undefined ? `${metrics.data.snapshot_age_hours}h` : '--'} detail={metrics.data ? `Threshold: ${metrics.data.stale_threshold_hours}h` : 'Freshness is measured from the last metrics snapshot.'} icon={<TriangleAlert className="size-8" />} />
        <StatCard eyebrow="Volume trace" value={trend.data ? String(trend.data.summary.total_volume_minor) : '--'} detail="Amounts are shown in minor units for accuracy, matching the backend accounting model." icon={<ChartNoAxesCombined className="size-8" />} />
      </div>

      <Card className="mt-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Metrics health payload</p>
        <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5 text-sm leading-7 text-[var(--text-secondary)]">
          {metrics.isLoading ? 'Loading admin metrics...' : null}
          {metrics.isError ? `Admin metrics returned: ${metrics.error instanceof Error ? metrics.error.message : 'Unknown error'}` : null}
          {metrics.data ? (
            <div className="space-y-2">
              <p><span className="text-[var(--text-primary)]">status:</span> {metrics.data.status}</p>
              <p><span className="text-[var(--text-primary)]">is_stale:</span> {String(metrics.data.is_stale)}</p>
              <p><span className="text-[var(--text-primary)]">last_snapshot_date:</span> {metrics.data.last_snapshot_date ?? 'n/a'}</p>
              <p><span className="text-[var(--text-primary)]">message:</span> {metrics.data.message}</p>
            </div>
          ) : null}
        </div>
      </Card>

      {resolutionFeedback ? (
        <Card className="mt-6">
          <p className="text-sm text-[var(--text-primary)]">{resolutionFeedback}</p>
        </Card>
      ) : null}

      <Card className="mt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Snapshot trend</p>
            <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Revenue and risk window</h2>
          </div>
          <div className="flex items-center gap-3">
            {[7, 30, 90].map((value) => (
              <button
                key={value}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  days === value
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--ink-strong)]'
                    : 'border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-secondary)]'
                }`}
                onClick={() => setDays(value)}
                type="button"
              >
                {value}d
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Window</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{trend.data?.window_days ?? days} days</p>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Fees collected</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{trend.data?.summary.total_fees_collected_minor ?? '--'}</p>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Avg high-risk escrow</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">
              {trend.data ? `${trend.data.summary.avg_high_risk_escrow_percentage}%` : '--'}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
          {trend.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading metrics trend...</p> : null}
          {trend.isError ? <p className="text-sm text-rose-300">{trend.error instanceof Error ? trend.error.message : 'Unable to load trend'}</p> : null}
          {trend.data ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {trend.data.trend.slice(-4).map((point, index) => (
                  <div key={`${getTrendDate(point)}-${index}`} className="rounded-[20px] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{getTrendDate(point)}</p>
                    <p className="mt-3 text-lg text-[var(--text-primary)]">{getTrendVolume(point)}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Risk {getTrendRisk(point)}%</p>
                  </div>
                ))}
              </div>

              <div className="flex h-52 items-end gap-3">
                {trend.data.trend.map((point, index) => (
                  <div key={`${getTrendDate(point)}-${index}-bar`} className="flex flex-1 flex-col items-center gap-3">
                    <div
                      className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,var(--brand-secondary),var(--brand-primary))]"
                      style={{ height: `${Math.max(8, (getTrendVolume(point) / maxVolume) * 180)}px` }}
                      title={`${getTrendDate(point)}: ${getTrendVolume(point)}`}
                    />
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                      {getTrendDate(point).slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Dispute operations</p>
            <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Escrow resolution desk</h2>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {disputedEscrows.data?.length ?? 0} open disputes
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {disputedEscrows.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading disputed escrows...</p> : null}
          {disputedEscrows.isError ? <p className="text-sm text-rose-300">{disputedEscrows.error instanceof Error ? disputedEscrows.error.message : 'Unable to load disputed escrows'}</p> : null}
          {disputedEscrows.data?.map((escrow) => (
            <div key={escrow.id} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-display text-2xl text-[var(--text-primary)]">{escrow.reference}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {escrow.amount_minor} {escrow.currency} · {escrow.status}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Client: {escrow.client}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Vendor: {escrow.vendor}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      setResolutionFeedback(null);
                      resolveEscrow.mutate({ escrowId: escrow.id, releaseToVendor: true });
                    }}
                    disabled={resolveEscrow.isPending}
                  >
                    Release to vendor
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setResolutionFeedback(null);
                      resolveEscrow.mutate({ escrowId: escrow.id, releaseToVendor: false });
                    }}
                    disabled={resolveEscrow.isPending}
                  >
                    Refund client
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!disputedEscrows.isLoading && !disputedEscrows.data?.length ? (
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5 text-sm text-[var(--text-secondary)]">
              No disputed escrows are open right now.
            </div>
          ) : null}
        </div>
      </Card>
    </DashboardShell>
  );
}
