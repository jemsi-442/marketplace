'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BriefcaseBusiness,
  ClipboardList,
  MessagesSquare,
  ShieldAlert,
  ShieldCheck,
  Users,
  Waypoints,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminOperationsAnalyticsBoard } from '@/components/dashboard/admin-operations-analytics-board';
import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionSummaryStrip } from '@/components/ui/action-summary-strip';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

const HOME_SUMMARY_STALE_MS = 60_000;

export default function AdminDashboardPage() {
  const token = useAuthStore((state) => state.token);
  const [days, setDays] = useState(30);

  const summary = useQuery({
    queryKey: ['admin-dashboard-summary', token],
    queryFn: () => apiClient.getAdminDashboardSummary(token ?? ''),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
  });

  const metricsHealth = useQuery({
    queryKey: ['admin-metrics-health', token],
    queryFn: () => apiClient.getAdminMetricsHealth(token ?? ''),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const metricsTrend = useQuery({
    queryKey: ['admin-metrics-trend', token, days],
    queryFn: () => apiClient.getAdminMetricsTrend(token ?? '', days),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const riskOverview = useQuery({
    queryKey: ['admin-risk-overview', token],
    queryFn: () => apiClient.getAdminRiskOverview(token ?? ''),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const data = summary.data ?? {
    open_requests: 0,
    pending_capabilities: 0,
    active_bookings: 0,
    disputes: 0,
  };

  const isLoading = summary.isLoading;
  const openDisputes = data.disputes;
  const criticalUsers = riskOverview.data?.summary.critical_users ?? 0;
  const trustWatchlist = riskOverview.data?.vendor_trust_watchlist.length ?? 0;
  const deskPressure = Math.min((data.open_requests + data.pending_capabilities + openDisputes) * 12, 100);

  return (
    <DashboardShell
      title="Operations"
      subtitle="Run the control desk from one place: incoming demand, risk movement, disputes, and active work all stay visible here."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/admin-requests">
            <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
              Open requests
              <ClipboardList className="size-4" />
            </Button>
          </Link>
          <Link href="/dashboard/admin-users">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Open users
              <Users className="size-4" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {isLoading ? (
          <>
            <Skeleton className="h-56 rounded-[30px]" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-52 rounded-[28px]" />
              ))}
            </div>
            <Skeleton className="h-[52rem] rounded-[30px]" />
          </>
        ) : (
          <>
            <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef5ff_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.18)] bg-white/82 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
                    <Waypoints className="size-3.5" />
                    Live operations board
                  </div>
                  <h2 className="mt-4 font-display text-3xl tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
                    See platform pressure before you open any control lane.
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                    This desk brings request flow, vendor readiness, dispute load, and account risk together so admin work feels coordinated instead of scattered across many pages.
                  </p>

                  <div className="mt-6">
                    <ActionSummaryStrip
                      title="What the operations desk needs next"
                      items={[
                        {
                          eyebrow: 'Request review',
                          value: String(data.open_requests),
                          detail:
                            data.open_requests > 0
                              ? 'New client work is waiting for proposal review and admin judgement.'
                              : 'The request review queue is currently calm.',
                          icon: <ClipboardList className="size-4" />,
                          tone: 'activity',
                        },
                        {
                          eyebrow: 'Vendor readiness',
                          value: String(data.pending_capabilities),
                          detail:
                            data.pending_capabilities > 0
                              ? 'Vendor lanes are waiting for approval before demand can reach them.'
                              : 'Capability approvals are caught up for now.',
                          icon: <Activity className="size-4" />,
                          tone: 'guidance',
                        },
                        {
                          eyebrow: 'Dispute pressure',
                          value: String(openDisputes),
                          detail:
                            openDisputes > 0
                              ? 'Escrow cases still need judgement from the admin desk.'
                              : 'No disputed escrows are waiting right now.',
                          icon: <ShieldCheck className="size-4" />,
                          tone: 'finance',
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Desk pressure</p>
                    <div className="mt-4 space-y-4">
                      {[
                        {
                          label: 'Immediate queue pressure',
                          value: deskPressure,
                          tone: 'var(--accent-coral)',
                        },
                        {
                          label: 'Critical account pressure',
                          value: Math.min(criticalUsers * 20, 100),
                          tone: 'var(--accent-amber)',
                        },
                        {
                          label: 'Trust watch pressure',
                          value: Math.min(trustWatchlist * 16, 100),
                          tone: 'var(--accent-cyan)',
                        },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-[var(--text-secondary)]">{item.label}</p>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">{Math.round(item.value)}%</span>
                          </div>
                          <div className="mt-2 h-2.5 rounded-full bg-[rgba(226,232,240,0.9)]">
                            <div className="h-2.5 rounded-full" style={{ width: `${Math.min(item.value, 100)}%`, backgroundColor: item.tone }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link href="/dashboard/admin-requests">
                      <Button className="h-full w-full justify-between rounded-[22px] bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
                        Open requests
                        <ClipboardList className="size-4" />
                      </Button>
                    </Link>
                    <Link href="/dashboard/admin-escrows">
                      <Button variant="ghost" className="h-full w-full justify-between rounded-[22px] border border-[var(--line)] px-4 py-5">
                        Open disputes
                        <ShieldCheck className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">Operations signals</p>
                <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Read the four numbers that shape the admin desk today</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                eyebrow="Open requests"
                value={String(data.open_requests)}
                detail="Client requests still waiting for admin review and assignment judgement."
                icon={<ClipboardList className="size-5" />}
                variant="market"
              />
              <StatCard
                eyebrow="Pending lanes"
                value={String(data.pending_capabilities)}
                detail="Vendor capability lanes waiting for approval before matching can continue."
                icon={<Activity className="size-5" />}
                variant="activity"
              />
              <StatCard
                eyebrow="Active bookings"
                value={String(data.active_bookings)}
                detail="Live work currently under platform-managed delivery and payment oversight."
                icon={<BriefcaseBusiness className="size-5" />}
                variant="communication"
              />
              <StatCard
                eyebrow="Disputes"
                value={String(data.disputes)}
                detail="Escrow cases currently open and waiting for a platform decision."
                icon={<ShieldAlert className="size-5" />}
                variant="risk"
              />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">Visual maps</p>
                <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Use health, trend, and risk graphics before intervening</h3>
              </div>
              <AdminOperationsAnalyticsBoard
                metrics={metricsHealth.data}
                trend={metricsTrend.data}
                riskOverview={riskOverview.data}
                openDisputes={data.disputes}
                actionableAccounts={criticalUsers + trustWatchlist}
                days={days}
                onDaysChange={setDays}
              />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">Working lanes</p>
                <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Open only the control lane that matches the next desk action</h3>
              </div>
              <div className="grid gap-6 xl:grid-cols-4">
              <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Lane 1</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Review incoming requests</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Compare vendor proposals, choose the best fit, and keep the request desk moving with clean decisions.</p>
                <div className="mt-auto pt-5">
                  <Link href="/dashboard/admin-requests">
                    <Button className="w-full justify-between">
                      Open request review
                      <ClipboardList className="size-4" />
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Lane 2</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Monitor active bookings</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Use the booking lane when payment, delivery, or final review needs direct admin attention.</p>
                <div className="mt-auto pt-5">
                  <Link href="/dashboard">
                    <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                      Open bookings
                      <BriefcaseBusiness className="size-4" />
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Lane 3</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Review vendor lanes</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Approve vendor capability lanes before those lanes can start receiving matched requests.</p>
                <div className="mt-auto pt-5">
                  <Link href="/dashboard/admin-capabilities">
                    <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                      Open capability lanes
                      <Activity className="size-4" />
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Lane 4</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Handle users, disputes, and coordination</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Manage accounts, review disputed escrows, and open inbox when platform-managed coordination needs attention.</p>
                <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-1">
                  <Link href="/dashboard/admin-users">
                    <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                      Open users
                      <Users className="size-4" />
                    </Button>
                  </Link>
                  <Link href="/dashboard/admin-escrows">
                    <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                      Open disputes
                      <ShieldCheck className="size-4" />
                    </Button>
                  </Link>
                  <Link href="/dashboard/communications">
                    <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                      Open inbox
                      <MessagesSquare className="size-4" />
                    </Button>
                  </Link>
                  <Link href="/dashboard/notifications">
                    <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                      Open alerts
                      <ShieldAlert className="size-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
