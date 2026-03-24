'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChartNoAxesCombined, Search, Shield, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ActionContextNote } from '@/components/ui/action-context-note';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { FirstSessionState } from '@/components/ui/first-session-state';
import { FormSection } from '@/components/ui/form-section';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { NextActionHint } from '@/components/ui/next-action-hint';
import { PulseMetricsStrip } from '@/components/ui/pulse-metrics-strip';
import { PriorityBanner } from '@/components/ui/priority-banner';
import { SectionHeader } from '@/components/ui/section-header';
import { SectionNavigator } from '@/components/ui/section-navigator';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkflowSteps } from '@/components/ui/workflow-steps';
import { WorkspaceIdentityBanner } from '@/components/ui/workspace-identity-banner';
import { WorkspaceGuide } from '@/components/ui/workspace-guide';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { wolfixServiceCategories } from '@/lib/marketplace';
import { getEscrowStatusTone, getLockTone, getRiskLevelTone, getVerificationTone } from '@/lib/status';
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

function getDisputeNextStep(status: string): string {
  if (status === 'DISPUTED') {
    return 'Review the dispute context, then choose release or return funds deliberately.';
  }

  return 'Open the wider case context before taking action.';
}

export default function AdminDashboardPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [days, setDays] = useState(30);
  const [resolutionFeedback, setResolutionFeedback] = useState<string | null>(null);
  const [disputeSearch, setDisputeSearch] = useState('');
  const [disputeView, setDisputeView] = useState<'all' | 'high_value'>('all');
  const [fraudSearch, setFraudSearch] = useState('');
  const [fraudLevelFilter, setFraudLevelFilter] = useState<'all' | 'HIGH' | 'CRITICAL'>('all');
  const [trustSearch, setTrustSearch] = useState('');
  const [trustLevelFilter, setTrustLevelFilter] = useState<'all' | 'HIGH' | 'CRITICAL'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [userStateFilter, setUserStateFilter] = useState<'all' | 'active' | 'locked'>('all');
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
  const adminUsers = useQuery({
    queryKey: ['admin-users', token],
    queryFn: () => apiClient.getAdminUsers(token ?? ''),
    enabled: Boolean(token),
  });
  const riskOverview = useQuery({
    queryKey: ['admin-risk-overview', token],
    queryFn: () => apiClient.getAdminRiskOverview(token ?? ''),
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
  const lockUser = useMutation({
    mutationFn: async (userId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.lockAdminUser(token, userId);
    },
    onSuccess: async (response) => {
      setResolutionFeedback(response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-risk-overview'] }),
      ]);
    },
    onError: (error) => {
      setResolutionFeedback(error instanceof Error ? error.message : 'Unable to lock user');
    },
  });
  const unlockUser = useMutation({
    mutationFn: async (userId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.unlockAdminUser(token, userId);
    },
    onSuccess: async (response) => {
      setResolutionFeedback(response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-risk-overview'] }),
      ]);
    },
    onError: (error) => {
      setResolutionFeedback(error instanceof Error ? error.message : 'Unable to unlock user');
    },
  });

  const maxVolume = Math.max(...(trend.data?.trend.map(getTrendVolume) ?? [1]));
  const actionUsers = useMemo(
    () => adminUsers.data?.filter((user) => !user.roles.includes('ROLE_ADMIN')).slice(0, 8) ?? [],
    [adminUsers.data],
  );
  const filteredFraudRisks = useMemo(() => {
    const query = fraudSearch.trim().toLowerCase();

    return (riskOverview.data?.latest_fraud_risks ?? []).filter((risk) => {
      const matchesLevel = fraudLevelFilter === 'all' || risk.risk_level === fraudLevelFilter;
      const searchable = `${risk.email} ${risk.reason} ${risk.created_at}`.toLowerCase();
      const matchesSearch = query.length === 0 || searchable.includes(query);

      return matchesLevel && matchesSearch;
    });
  }, [fraudLevelFilter, fraudSearch, riskOverview.data?.latest_fraud_risks]);
  const filteredTrustWatchlist = useMemo(() => {
    const query = trustSearch.trim().toLowerCase();

    return (riskOverview.data?.vendor_trust_watchlist ?? []).filter((vendor) => {
      const matchesLevel = trustLevelFilter === 'all' || vendor.risk_level === trustLevelFilter;
      const searchable = `${vendor.vendor_email} ${vendor.risk_level} ${vendor.average_rating} ${vendor.updated_at}`.toLowerCase();
      const matchesSearch = query.length === 0 || searchable.includes(query);

      return matchesLevel && matchesSearch;
    });
  }, [riskOverview.data?.vendor_trust_watchlist, trustLevelFilter, trustSearch]);
  const filteredActionUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();

    return actionUsers.filter((user) => {
      const matchesState =
        userStateFilter === 'all' ||
        (userStateFilter === 'locked' && user.is_locked) ||
        (userStateFilter === 'active' && !user.is_locked);
      const searchable = `${user.email} ${user.roles.join(' ')}`.toLowerCase();
      const matchesSearch = query.length === 0 || searchable.includes(query);

      return matchesState && matchesSearch;
    });
  }, [actionUsers, userSearch, userStateFilter]);
  const fraudSummaryMessage = fraudSearch.trim().length > 0
    ? `Showing ${filteredFraudRisks.length} fraud alert${filteredFraudRisks.length === 1 ? '' : 's'} for "${fraudSearch.trim()}" in the current risk view.`
    : fraudLevelFilter === 'all'
      ? `Showing ${filteredFraudRisks.length} fraud alert${filteredFraudRisks.length === 1 ? '' : 's'} from the latest watchlist capture.`
      : `Showing ${filteredFraudRisks.length} ${fraudLevelFilter.toLowerCase()} fraud alert${filteredFraudRisks.length === 1 ? '' : 's'} in the current watchlist view.`;
  const trustSummaryMessage = trustSearch.trim().length > 0
    ? `Showing ${filteredTrustWatchlist.length} provider profile${filteredTrustWatchlist.length === 1 ? '' : 's'} for "${trustSearch.trim()}" in the current trust view.`
    : trustLevelFilter === 'all'
      ? `Showing ${filteredTrustWatchlist.length} provider profile${filteredTrustWatchlist.length === 1 ? '' : 's'} in the current trust watchlist.`
      : `Showing ${filteredTrustWatchlist.length} ${trustLevelFilter.toLowerCase()} trust profile${filteredTrustWatchlist.length === 1 ? '' : 's'} in the current watchlist view.`;
  const userSummaryMessage = userSearch.trim().length > 0
    ? `Showing ${filteredActionUsers.length} account${filteredActionUsers.length === 1 ? '' : 's'} for "${userSearch.trim()}" in the current control view.`
    : userStateFilter === 'all'
      ? `Showing ${filteredActionUsers.length} actionable account${filteredActionUsers.length === 1 ? '' : 's'} in the current control desk.`
      : `Showing ${filteredActionUsers.length} ${userStateFilter} account${filteredActionUsers.length === 1 ? '' : 's'} in the current control view.`;
  const hasFraudFilters = fraudSearch.trim().length > 0 || fraudLevelFilter !== 'all';
  const hasTrustFilters = trustSearch.trim().length > 0 || trustLevelFilter !== 'all';
  const hasUserFilters = userSearch.trim().length > 0 || userStateFilter !== 'all';
  const filteredDisputes = useMemo(() => {
    const query = disputeSearch.trim().toLowerCase();

    return (disputedEscrows.data ?? []).filter((escrow) => {
      const matchesView = disputeView === 'all' || escrow.amount_minor >= 100000;
      const searchable = `${escrow.reference} ${escrow.client} ${escrow.vendor} ${escrow.amount_minor}`.toLowerCase();
      const matchesSearch = query.length === 0 || searchable.includes(query);

      return matchesView && matchesSearch;
    });
  }, [disputeSearch, disputeView, disputedEscrows.data]);
  const disputeSummaryMessage = disputeSearch.trim().length > 0
    ? `Showing ${filteredDisputes.length} dispute${filteredDisputes.length === 1 ? '' : 's'} for "${disputeSearch.trim()}" in the current desk view.`
    : disputeView === 'all'
      ? `Showing ${filteredDisputes.length} open dispute${filteredDisputes.length === 1 ? '' : 's'} in the current desk view.`
      : `Showing ${filteredDisputes.length} high-value dispute${filteredDisputes.length === 1 ? '' : 's'} in the current desk view.`;
  const hasDisputeFilters = disputeSearch.trim().length > 0 || disputeView !== 'all';
  const openDisputeCount = disputedEscrows.data?.length ?? 0;
  const criticalUserCount = riskOverview.data?.summary.critical_users ?? 0;
  const trustWatchlistCount = riskOverview.data?.vendor_trust_watchlist.length ?? 0;
  const fraudSnapshotCount = riskOverview.data?.latest_fraud_risks.length ?? 0;
  const metricsNeedAttention = metrics.data ? (!metrics.data.is_healthy || metrics.data.is_stale) : false;
  const isAdminFirstSession =
    !disputedEscrows.isLoading &&
    !disputedEscrows.isError &&
    !riskOverview.isLoading &&
    !riskOverview.isError &&
    !adminUsers.isLoading &&
    !adminUsers.isError &&
    openDisputeCount === 0 &&
    fraudSnapshotCount === 0 &&
    trustWatchlistCount === 0 &&
    actionUsers.length === 0;
  const adminPriority = openDisputeCount
    ? {
        title: 'An open dispute should be the first controlled decision',
        description: 'Start in the dispute desk, review the booking facts, and resolve one case cleanly before moving to broader watchlist work.',
        tone: 'risk' as const,
      }
    : criticalUserCount
      ? {
          title: 'Critical account risk needs review before lower-priority work',
          description: 'Inspect the fraud watchlist and user controls next so any intervention is backed by a clear pattern instead of a quick reaction.',
          tone: 'guidance' as const,
        }
      : metricsNeedAttention
        ? {
            title: 'Platform health signals need a careful check first',
            description: 'The latest metrics snapshot suggests the desk should confirm health and freshness before treating the rest of the workspace as stable.',
            tone: 'activity' as const,
          }
        : trustWatchlistCount
          ? {
              title: 'Business trust review is the next best operator task',
              description: 'The dispute desk is quiet enough for you to review lower-trust provider profiles and decide whether any deeper follow-up is justified.',
              tone: 'market' as const,
            }
          : {
              title: 'The desk is stable enough for broad operations review',
              description: 'No urgent dispute or critical account is forcing the next move, so you can scan trends, trust posture, and user controls more deliberately.',
              tone: 'finance' as const,
            };

  const jumpToAdminSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const focusDisputeCase = (reference: string, highValue = false) => {
    setDisputeSearch(reference);
    setDisputeView(highValue ? 'high_value' : 'all');
    jumpToAdminSection('admin-disputes');
  };

  const focusUserAccount = (email: string, state: 'all' | 'active' | 'locked' = 'all') => {
    setUserSearch(email);
    setUserStateFilter(state);
    jumpToAdminSection('admin-user-controls');
  };

  const focusTrustProfile = (email: string, level: 'all' | 'HIGH' | 'CRITICAL' = 'all') => {
    setTrustSearch(email);
    setTrustLevelFilter(level);
    jumpToAdminSection('admin-trust-watchlist');
  };

  return (
    <DashboardShell
      title="Operations desk"
      subtitle="Review marketplace health, watchlists, disputes, and platform-wide activity from one WOLFIX operations surface."
      mobileQuickActions={
        <div className="grid grid-cols-3 gap-2">
          <Link href="#admin-disputes">
            <Button size="sm" variant="ghost" className="w-full">Disputes</Button>
          </Link>
          <Link href="#admin-fraud-watchlist">
            <Button size="sm" className="w-full">Risk</Button>
          </Link>
          <Link href="#admin-user-controls">
            <Button size="sm" variant="ghost" className="w-full">Users</Button>
          </Link>
        </div>
      }
    >
      <div className="animate-fade-up">
        <WorkspaceGuide
          eyebrow="How to use operations"
          title="This page is for review, judgement, and controlled intervention"
          description="Move in a strict order: confirm platform health, inspect risk or dispute context, then take action only when the evidence is clear."
          points={[
            'Check health and trend sections before acting on individual issues.',
            'Use dispute controls only after confirming the booking and payment context.',
            'Use watchlists to identify priorities, not to act blindly on every alert.',
            'Lock or unlock accounts only when user behaviour clearly supports that decision.',
          ]}
          tip="This workspace is easiest to use when you decide one priority first, then work downward from that priority instead of scanning everything at once."
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '20ms' }}>
        <WorkspaceIdentityBanner
          tone="admin"
          title="This desk is built for controlled intervention, not passive monitoring"
          description="Use this workspace when trust, disputes, finance signals, or account controls need a deliberate operator decision. It should feel distinct from the client and vendor surfaces because the cost of acting carelessly is higher here."
          highlights={[
            'Read evidence before applying a restriction or settlement decision.',
            'Watchlists help prioritise, but they should not trigger blind action.',
            'Resolve one important case cleanly before chasing lower-value noise.',
          ]}
          actions={
            <>
              <Button size="sm" onClick={() => jumpToAdminSection('admin-disputes')}>
                Open dispute desk
              </Button>
              <Button size="sm" variant="ghost" onClick={() => jumpToAdminSection('admin-fraud-watchlist')}>
                Open risk watchlist
              </Button>
            </>
          }
        />
      </div>

      {isAdminFirstSession ? (
        <FirstSessionState
          title="This operations desk is in first-session mode"
          description="No disputes, user interventions, or trust watchlist escalations are active yet. That usually means the marketplace has not produced enough pressure to require intervention, so start by learning the desk layout and review cadence."
          steps={[
            {
              label: 'Read health and trend signals first',
              detail: 'Understand the platform pulse before you expect dispute or risk streams to appear.',
              href: '#admin-disputes',
            },
            {
              label: 'Learn where escalations will appear',
              detail: 'Disputes, fraud signals, trust watchlists, and user controls each wake up in their own lane here.',
              href: '#admin-fraud-watchlist',
            },
            {
              label: 'Return when live cases exist',
              detail: 'Once the marketplace creates real pressure, this desk becomes the place for controlled intervention.',
              href: '#admin-user-controls',
            },
          ]}
          actions={
            <>
              <Link href="/dashboard">
                <Button size="sm">Open overview</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => jumpToAdminSection('admin-fraud-watchlist')}>
                Learn the watchlists
              </Button>
            </>
          }
        />
      ) : null}

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '40ms' }}>
        <WorkflowSteps
          eyebrow="Typical operations path"
          title="Follow this sequence for cleaner decisions"
          steps={[
            { title: 'Review health', description: 'Confirm whether the platform state or snapshot freshness is already signalling a problem.' },
            { title: 'Inspect watchlists', description: 'See which disputes, risks, or users need attention first.' },
            { title: 'Take one decision', description: 'Resolve the dispute, apply the user action, or log the platform choice deliberately.' },
            { title: 'Re-check status', description: 'Return to the metrics and watchlists to confirm the desk is stable again.' },
          ]}
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '80ms' }}>
        <SectionNavigator
          className="mt-6"
          title="Move through operations without losing context"
          description="Use this navigator when you need to jump directly into disputes, risk review, trust review, or account controls."
          items={[
            { href: '#admin-disputes', label: 'Dispute desk', helper: 'Resolve live escrow disputes.' },
            { href: '#admin-fraud-watchlist', label: 'Fraud watchlist', helper: 'Inspect risk captures first.' },
            { href: '#admin-trust-watchlist', label: 'Trust watchlist', helper: 'Review lower-trust providers.' },
            { href: '#admin-user-controls', label: 'User controls', helper: 'Lock or unlock only when justified.' },
          ]}
        />
      </div>

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '120ms' }}>
        <PriorityBanner
          title={adminPriority.title}
          description={adminPriority.description}
          tone={adminPriority.tone}
          actions={
            <>
              <Button
                size="sm"
                variant={openDisputeCount ? 'primary' : 'ghost'}
                onClick={() => jumpToAdminSection('admin-disputes')}
              >
                Resolve disputes
              </Button>
              <Button
                size="sm"
                variant={criticalUserCount ? 'primary' : 'ghost'}
                onClick={() => jumpToAdminSection('admin-fraud-watchlist')}
              >
                Review critical users
              </Button>
              <Button
                size="sm"
                variant={trustWatchlistCount && !openDisputeCount && !criticalUserCount ? 'primary' : 'ghost'}
                onClick={() => jumpToAdminSection('admin-trust-watchlist')}
              >
                Inspect trust
              </Button>
              <Button
                size="sm"
                variant={metricsNeedAttention && !openDisputeCount && !criticalUserCount ? 'primary' : 'ghost'}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Recheck health
              </Button>
            </>
          }
        />
      </div>

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '150ms' }}>
        <PulseMetricsStrip
          title="Read the operations pulse before opening a case"
          description="These counters tell you whether the day is currently dominated by disputes, critical risk, or account intervention."
          items={[
            {
              label: 'Open disputes',
              value: String(disputedEscrows.data?.length ?? 0),
              detail: disputedEscrows.data?.length ? 'These are the cases still waiting for a single clean resolution.' : 'No dispute case is currently waiting in the desk.',
              icon: <TriangleAlert className="size-5" />,
              variant: 'risk',
            },
            {
              label: 'Critical users',
              value: riskOverview.data ? String(riskOverview.data.summary.critical_users) : '--',
              detail: riskOverview.data ? 'These accounts sit at the highest current risk level in the watchlist.' : 'Critical account count appears once risk data is available.',
              icon: <Shield className="size-5" />,
              variant: 'guidance',
            },
            {
              label: 'Actionable accounts',
              value: String(actionUsers.length),
              detail: actionUsers.length ? 'These are the non-admin accounts currently surfaced in the user control desk.' : 'No account is currently queued for immediate operator review.',
              icon: <ChartNoAxesCombined className="size-5" />,
              variant: 'activity',
            },
          ]}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard eyebrow="Platform health" value={metrics.data?.is_healthy ? 'Healthy' : metrics.data?.status ?? 'Review'} detail={metrics.data ? metrics.data.message : 'Additional system metrics appear when this workspace has the right access.'} icon={<Shield className="size-8" />} variant="guidance" />
        <StatCard eyebrow="Snapshot age" value={metrics.data?.snapshot_age_hours !== undefined ? `${metrics.data.snapshot_age_hours}h` : '--'} detail={metrics.data ? `Threshold: ${metrics.data.stale_threshold_hours}h` : 'Freshness is measured from the last metrics snapshot.'} icon={<TriangleAlert className="size-8" />} variant="risk" />
        <StatCard eyebrow="Volume trace" value={trend.data ? String(trend.data.summary.total_volume_minor) : '--'} detail="Amounts are shown in minor units for consistency and accuracy." icon={<ChartNoAxesCombined className="size-8" />} variant="finance" />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <StatCard eyebrow="High-risk users" value={riskOverview.data ? String(riskOverview.data.summary.high_or_critical_users) : '--'} detail={riskOverview.data ? `${riskOverview.data.summary.critical_users} critical across ${riskOverview.data.summary.users_monitored} monitored users` : 'Loading risk watchlist...'} icon={<TriangleAlert className="size-8" />} variant="risk" />
        <StatCard eyebrow="Business watchlist" value={riskOverview.data ? String(riskOverview.data.summary.vendors_monitored) : '--'} detail="This watchlist is ordered from the weakest business trust posture upward." icon={<Shield className="size-8" />} variant="market" />
        <StatCard eyebrow="Fraud telemetry" value={riskOverview.data ? String(riskOverview.data.latest_fraud_risks.length) : '--'} detail="Recent fraud snapshots captured by the risk engine." icon={<ChartNoAxesCombined className="size-8" />} variant="activity" />
      </div>

      <Card variant="activity" className="mt-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Metrics snapshot</p>
        <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5 text-sm leading-7 text-[var(--text-secondary)]">
          {metrics.isLoading ? 'Loading marketplace metrics...' : null}
          {metrics.isError ? (
            <FeedbackBanner
              message={metrics.error instanceof Error ? metrics.error.message : 'Metrics could not be loaded'}
              tone="danger"
            />
          ) : null}
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

      <Card variant="market" className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Marketplace coverage</p>
            <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">WOLFIX digital service lanes</h2>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {wolfixServiceCategories.length} categories
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {wolfixServiceCategories.map((category) => (
            <span key={category} className="rounded-full border border-[var(--line)] bg-[rgba(30,99,219,0.1)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--brand-secondary)]">
              {category}
            </span>
          ))}
        </div>
      </Card>

      {resolutionFeedback ? <div className="mt-6"><FeedbackBanner message={resolutionFeedback} tone="info" onDismiss={() => setResolutionFeedback(null)} /></div> : null}

      <Card variant="finance" className="mt-6">
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
          <div className="rounded-[24px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.62),rgba(32,47,132,0.42))] p-5 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '0ms' }}>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Window</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{trend.data?.window_days ?? days} days</p>
          </div>
          <div className="rounded-[24px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.62),rgba(32,47,132,0.42))] p-5 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '55ms' }}>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Fees collected</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{trend.data?.summary.total_fees_collected_minor ?? '--'}</p>
          </div>
          <div className="rounded-[24px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.62),rgba(32,47,132,0.42))] p-5 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '110ms' }}>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Avg high-risk escrow</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">
              {trend.data ? `${trend.data.summary.avg_high_risk_escrow_percentage}%` : '--'}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
          {trend.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading metrics trend...</p> : null}
          {trend.isError ? (
            <FeedbackBanner message={trend.error instanceof Error ? trend.error.message : 'Unable to load trend'} tone="danger" />
          ) : null}
          {trend.data ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {trend.data.trend.slice(-4).map((point, index) => (
                  <div key={`${getTrendDate(point)}-${index}`} className="rounded-[20px] border border-[rgba(184,208,255,0.16)] bg-[rgba(255,255,255,0.04)] p-4 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: `${index * 50}ms` }}>
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

      <Card id="admin-disputes" variant="risk" className="mt-6 scroll-mt-24">
        <SectionHeader
          eyebrow="Dispute operations"
          title="Escrow resolution desk"
          description="Work through open disputes with one deliberate resolution at a time."
          variant="risk"
          sticky
          actions={
            <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {disputedEscrows.data?.length ?? 0} open disputes
            </div>
          }
        />

        <div className="mt-6 space-y-4">
          {disputedEscrows.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading disputed escrows...</p> : null}
          {disputedEscrows.isError ? (
            <FeedbackBanner message={disputedEscrows.error instanceof Error ? disputedEscrows.error.message : 'Unable to load disputed escrows'} tone="danger" />
          ) : null}
          <div className="grid gap-4 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(16,38,48,0.76),rgba(12,29,37,0.56))] p-5">
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="admin-dispute-search">Search dispute cases</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  id="admin-dispute-search"
                  value={disputeSearch}
                  onChange={(event) => setDisputeSearch(event.target.value)}
                  placeholder="Search reference, requester, provider, or amount..."
                  className="pl-11"
                />
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Desk view</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All disputes' },
                  { value: 'high_value', label: 'High value only' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDisputeView(option.value as 'all' | 'high_value')}
                    className={
                      disputeView === option.value
                        ? 'rounded-full border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-strong)]'
                        : 'rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]'
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <InlineStateNote message={disputeSummaryMessage} />
              {hasDisputeFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDisputeSearch('');
                    setDisputeView('all');
                  }}
                >
                  Reset dispute view
                </Button>
              ) : null}
            </div>
          </div>
          {filteredDisputes.map((escrow, index) => (
            <div key={escrow.id} className="rounded-[24px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.56),rgba(108,36,74,0.4))] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(0,0,0,0.24)] animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: `${index * 55}ms` }}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-display text-2xl text-[var(--text-primary)]">{escrow.reference}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge label={escrow.status} tone={getEscrowStatusTone(escrow.status)} />
                    <span className="text-sm text-[var(--text-secondary)]">{escrow.amount_minor} {escrow.currency}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Requester: {escrow.client}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Provider: {escrow.vendor}</p>
                </div>
                <div className="min-w-0 flex-1 space-y-3 lg:max-w-xl">
                  <FormSection
                    step="01"
                    title="Resolve this dispute once"
                    description="Pick one outcome only after the booking facts and delivery record support it clearly."
                    tone="guidance"
                    className="p-4"
                  >
                    <div className="flex flex-wrap gap-3">
                      <Button
                        size="sm"
                        onClick={() => {
                          setResolutionFeedback(null);
                          resolveEscrow.mutate({ escrowId: escrow.id, releaseToVendor: true });
                        }}
                        disabled={resolveEscrow.isPending}
                      >
                        Release payment
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
                        Return funds
                      </Button>
                    </div>
                    <InlineStateNote message="A clean resolution means one final outcome, backed by the delivery record and dispute facts, without acting twice." />
                  </FormSection>
                  <div className="lg:max-w-xl">
                    <ActionContextNote text="Release payment completes settlement to the provider. Return funds closes the case in favour of the buyer. Choose only after the delivery record and dispute facts line up." />
                  </div>
                </div>
                <NextActionHint
                  label={getDisputeNextStep(escrow.status)}
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => focusDisputeCase(escrow.reference, escrow.amount_minor >= 100000)}
                    >
                      Focus case
                    </Button>
                  }
                />
              </div>
            </div>
          ))}
          {!disputedEscrows.isLoading && !disputedEscrows.data?.length ? (
            <EmptyState
              icon={<Shield className="size-5" />}
              title="No disputes need action right now"
              description="This desk becomes active only when a booking enters formal dispute review."
              action={
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => jumpToAdminSection('admin-fraud-watchlist')}>
                    Review risk watchlist
                  </Button>
                  <Link href="/dashboard">
                    <Button size="sm">Open overview</Button>
                  </Link>
                </div>
              }
            />
          ) : null}
          {!disputedEscrows.isLoading && Boolean(disputedEscrows.data?.length) && !filteredDisputes.length ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="No disputes match this desk view"
              description="Reset the current dispute search or desk view to reopen the full case list."
              action={
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDisputeSearch('');
                    setDisputeView('all');
                  }}
                >
                  Clear dispute filters
                </Button>
              }
            />
          ) : null}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card id="admin-fraud-watchlist" variant="risk" className="scroll-mt-24">
          <SectionHeader
            eyebrow="Fraud watchlist"
            title="Latest user risk snapshots"
            description="Use this stream to inspect recent risk captures before touching account controls."
            variant="risk"
            sticky
            actions={
              <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                {riskOverview.data?.latest_fraud_risks.length ?? 0} records
              </div>
            }
          />

          <div className="mt-6 space-y-4">
            {riskOverview.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading fraud watchlist...</p> : null}
            {riskOverview.isError ? (
              <FeedbackBanner message={riskOverview.error instanceof Error ? riskOverview.error.message : 'Unable to load risk overview'} tone="danger" />
            ) : null}
            <div className="grid gap-4 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(16,38,48,0.76),rgba(12,29,37,0.56))] p-5">
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]" htmlFor="admin-fraud-search">Search fraud alerts</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    id="admin-fraud-search"
                    value={fraudSearch}
                    onChange={(event) => setFraudSearch(event.target.value)}
                    placeholder="Search email, reason, or capture date..."
                    className="pl-11"
                  />
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Risk level</p>
                <div className="flex flex-wrap gap-2">
                  {['all', 'HIGH', 'CRITICAL'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFraudLevelFilter(level as 'all' | 'HIGH' | 'CRITICAL')}
                      className={
                        fraudLevelFilter === level
                          ? 'rounded-full border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-strong)]'
                          : 'rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]'
                      }
                    >
                      {level === 'all' ? 'All levels' : level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <InlineStateNote message={fraudSummaryMessage} />
                {hasFraudFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFraudSearch('');
                      setFraudLevelFilter('all');
                    }}
                  >
                    Reset fraud view
                  </Button>
                ) : null}
              </div>
            </div>
            {filteredFraudRisks.map((risk, index) => (
              <div key={risk.id} className="rounded-[22px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.56),rgba(108,36,74,0.4))] p-4 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: `${index * 45}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[var(--text-primary)]">{risk.email}</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{risk.reason}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{risk.created_at}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={risk.risk_level} tone={getRiskLevelTone(risk.risk_level)} />
                    <StatusBadge label={`score ${risk.score}`} tone={getRiskLevelTone(risk.risk_level)} />
                  </div>
                </div>
                <NextActionHint
                  label="Use the user control desk below only if the risk pattern clearly justifies intervention."
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => focusUserAccount(risk.email)}
                    >
                      Inspect account
                    </Button>
                  }
                />
              </div>
            ))}
            {!riskOverview.isLoading && !riskOverview.data?.latest_fraud_risks.length ? (
              <EmptyState
                icon={<TriangleAlert className="size-5" />}
                title="No fraud snapshots yet"
                description="Recent user risk signals will appear here when the risk engine captures them."
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => jumpToAdminSection('admin-trust-watchlist')}>
                      Open trust review
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => jumpToAdminSection('admin-user-controls')}>
                      Review account controls
                    </Button>
                  </div>
                }
              />
            ) : null}
            {!riskOverview.isLoading && Boolean(riskOverview.data?.latest_fraud_risks.length) && !filteredFraudRisks.length ? (
              <EmptyState
                icon={<Search className="size-5" />}
                title="No fraud alerts match this view"
                description="Reset the current fraud search or level filter to reopen the full watchlist."
                action={
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFraudSearch('');
                      setFraudLevelFilter('all');
                    }}
                  >
                    Clear fraud filters
                  </Button>
                }
              />
            ) : null}
          </div>
        </Card>

        <Card id="admin-trust-watchlist" variant="market" className="scroll-mt-24">
          <SectionHeader
            eyebrow="Business trust watchlist"
            title="Lowest trust profiles first"
            description="Scan provider trust weakness here before deciding whether a deeper review is needed."
            variant="market"
            sticky
            actions={
              <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                {riskOverview.data?.vendor_trust_watchlist.length ?? 0} profiles
              </div>
            }
          />

          <div className="mt-6 space-y-4">
            <div className="grid gap-4 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(16,38,48,0.76),rgba(12,29,37,0.56))] p-5">
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]" htmlFor="admin-trust-search">Search provider profiles</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    id="admin-trust-search"
                    value={trustSearch}
                    onChange={(event) => setTrustSearch(event.target.value)}
                    placeholder="Search provider email or trust context..."
                    className="pl-11"
                  />
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Trust level</p>
                <div className="flex flex-wrap gap-2">
                  {['all', 'HIGH', 'CRITICAL'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setTrustLevelFilter(level as 'all' | 'HIGH' | 'CRITICAL')}
                      className={
                        trustLevelFilter === level
                          ? 'rounded-full border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-strong)]'
                          : 'rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]'
                      }
                    >
                      {level === 'all' ? 'All levels' : level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <InlineStateNote message={trustSummaryMessage} />
                {hasTrustFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTrustSearch('');
                      setTrustLevelFilter('all');
                    }}
                  >
                    Reset trust view
                  </Button>
                ) : null}
              </div>
            </div>
            {filteredTrustWatchlist.map((vendor, index) => (
              <div key={vendor.vendor_id} className="rounded-[22px] border border-[rgba(123,165,255,0.2)] bg-[linear-gradient(180deg,rgba(12,35,91,0.62),rgba(18,64,134,0.42))] p-4 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: `${index * 45}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[var(--text-primary)]">{vendor.vendor_email}</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Rating {vendor.average_rating.toFixed(1)} · Disputes {vendor.dispute_count} · Jobs {vendor.completed_jobs_count}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{vendor.updated_at}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={vendor.risk_level} tone={getRiskLevelTone(vendor.risk_level)} />
                    <StatusBadge label={`trust ${vendor.calculated_trust_score}`} tone={getRiskLevelTone(vendor.risk_level)} />
                  </div>
                </div>
                <NextActionHint
                  label="Review the provider's disputes, rating, and completed work before escalating any action."
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => focusTrustProfile(vendor.vendor_email, vendor.risk_level === 'HIGH' || vendor.risk_level === 'CRITICAL' ? vendor.risk_level : 'all')}
                    >
                      Focus provider
                    </Button>
                  }
                />
              </div>
            ))}
            {!riskOverview.isLoading && !riskOverview.data?.vendor_trust_watchlist.length ? (
              <EmptyState
                icon={<Shield className="size-5" />}
                title="No trust watchlist entries yet"
                description="Lower-trust provider signals will appear here when the platform has enough activity to score them."
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => jumpToAdminSection('admin-disputes')}>
                      Review dispute desk
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => jumpToAdminSection('admin-user-controls')}>
                      Check user controls
                    </Button>
                  </div>
                }
              />
            ) : null}
            {!riskOverview.isLoading && Boolean(riskOverview.data?.vendor_trust_watchlist.length) && !filteredTrustWatchlist.length ? (
              <EmptyState
                icon={<Search className="size-5" />}
                title="No provider profiles match this view"
                description="Reset the trust search or level filter to reopen the full provider watchlist."
                action={
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setTrustSearch('');
                      setTrustLevelFilter('all');
                    }}
                  >
                    Clear trust filters
                  </Button>
                }
              />
            ) : null}
          </div>
        </Card>
      </div>

      <Card id="admin-user-controls" variant="guidance" className="mt-6 scroll-mt-24">
        <SectionHeader
          eyebrow="User control desk"
          title="Lock and unlock accounts"
          description="Use this area only for accounts that clearly need intervention."
          variant="guidance"
          sticky
          actions={
            <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {actionUsers.length} actionable users
            </div>
          }
        />

        <div className="mt-6 space-y-4">
          {adminUsers.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading users...</p> : null}
          {adminUsers.isError ? (
            <FeedbackBanner message={adminUsers.error instanceof Error ? adminUsers.error.message : 'Unable to load users'} tone="danger" />
          ) : null}
          <div className="grid gap-4 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(16,38,48,0.76),rgba(12,29,37,0.56))] p-5">
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="admin-user-search">Search accounts</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  id="admin-user-search"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search email or role..."
                  className="pl-11"
                />
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Account state</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All accounts' },
                  { value: 'active', label: 'Active only' },
                  { value: 'locked', label: 'Locked only' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setUserStateFilter(option.value as 'all' | 'active' | 'locked')}
                    className={
                      userStateFilter === option.value
                        ? 'rounded-full border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-strong)]'
                        : 'rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]'
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <InlineStateNote message={userSummaryMessage} />
              {hasUserFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUserSearch('');
                    setUserStateFilter('all');
                  }}
                >
                  Reset user view
                </Button>
              ) : null}
            </div>
          </div>
          {filteredActionUsers.map((user, index) => (
            <div key={user.id} className="rounded-[22px] border border-[rgba(184,208,255,0.16)] bg-[rgba(255,255,255,0.04)] p-4 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: `${index * 40}ms` }}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[var(--text-primary)]">{user.email}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{user.roles.join(', ')}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge label={user.is_verified ? 'verified' : 'unverified'} tone={getVerificationTone(user.is_verified)} />
                    <StatusBadge label={user.is_locked ? 'locked' : 'active'} tone={getLockTone(user.is_locked)} />
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-3 lg:max-w-xl">
                  <FormSection
                    step="01"
                    title={user.is_locked ? 'Restore access carefully' : 'Restrict access carefully'}
                    description={
                      user.is_locked
                        ? 'Unlock only when the account no longer presents a trust or safety concern.'
                        : 'Lock only when the risk pattern, fraud signal, or policy breach is clear enough to defend.'
                    }
                    tone={user.is_locked ? 'activity' : 'guidance'}
                    className="p-4"
                  >
                    <div className="flex flex-wrap gap-3">
                      {user.is_locked ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setResolutionFeedback(null);
                            unlockUser.mutate(user.id);
                          }}
                          disabled={unlockUser.isPending}
                        >
                          Unlock
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setResolutionFeedback(null);
                            lockUser.mutate(user.id);
                          }}
                          disabled={lockUser.isPending}
                        >
                          Lock
                        </Button>
                      )}
                    </div>
                    <InlineStateNote
                      message={
                        user.is_locked
                          ? 'Use unlock when the account can safely resume normal marketplace activity.'
                          : 'Use lock when immediate access removal is the safest path for the platform.'
                      }
                    />
                  </FormSection>
                  <div className="lg:max-w-xl">
                    <ActionContextNote text={user.is_locked ? 'Unlock restores access immediately. Use it only when the account no longer presents a trust or safety concern.' : 'Lock removes access immediately. Use it only when the behaviour pattern, fraud signal, or policy breach is clear enough to defend.'} />
                  </div>
                </div>
                <NextActionHint
                  label={user.is_locked ? 'Unlock only when the account is safe to restore.' : 'Lock only when the user behaviour clearly threatens trust or safety.'}
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFraudSearch(user.email);
                        setFraudLevelFilter('all');
                        jumpToAdminSection('admin-fraud-watchlist');
                      }}
                    >
                      Review risk context
                    </Button>
                  }
                />
              </div>
            </div>
          ))}
          {!adminUsers.isLoading && !actionUsers.length ? (
            <EmptyState
              icon={<Shield className="size-5" />}
              title="No account actions pending"
              description="When non-admin accounts need intervention, they will appear here with their current state."
              action={
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => jumpToAdminSection('admin-fraud-watchlist')}>
                    Inspect risk watchlist
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => jumpToAdminSection('admin-trust-watchlist')}>
                    Inspect trust review
                  </Button>
                </div>
              }
            />
          ) : null}
          {!adminUsers.isLoading && Boolean(actionUsers.length) && !filteredActionUsers.length ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="No accounts match this view"
              description="Reset the current account search or state filter to reopen the full control list."
              action={
                <Button
                  variant="ghost"
                  onClick={() => {
                    setUserSearch('');
                    setUserStateFilter('all');
                  }}
                >
                  Clear account filters
                </Button>
              }
            />
          ) : null}
        </div>
      </Card>
    </DashboardShell>
  );
}
