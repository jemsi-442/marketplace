'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BriefcaseBusiness,
  ClipboardList,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Waypoints,
} from 'lucide-react';
import Link from 'next/link';

import { MiniDistributionCard } from '@/components/dashboard/mini-distribution-card';
import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionSummaryStrip } from '@/components/ui/action-summary-strip';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

const HOME_SUMMARY_STALE_MS = 60_000;

function formatMoney(amountMinor: number, currency = 'TZS'): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function formatPercent(value: number): string {
  return `${Math.max(0, Math.min(Math.round(value), 100))}%`;
}

export default function VendorDashboardPage() {
  const token = useAuthStore((state) => state.token);

  const vendorSummary = useQuery({
    queryKey: ['vendor-dashboard-summary', token],
    queryFn: () => apiClient.getVendorDashboardSummary(token ?? ''),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
  });
  const summary = vendorSummary.data ?? {
    active_capabilities: 0,
    approved_capabilities: 0,
    pending_capabilities: 0,
    returned_capabilities: 0,
    open_requests: 0,
    active_bookings: 0,
    protected_bookings: 0,
    available_balance_minor: 0,
    currency: 'TZS',
  };

  const isLoading = vendorSummary.isLoading;
  const studioCoverage = summary.active_capabilities ? (summary.approved_capabilities / summary.active_capabilities) * 100 : 0;
  const deliveryProtection = summary.active_bookings ? (summary.protected_bookings / summary.active_bookings) * 100 : 0;
  const demandPressure = Math.min((summary.open_requests + summary.active_bookings) * 18, 100);

  return (
    <DashboardShell
      title="Studio"
      subtitle="See readiness, demand, and protected work in one place before you open any vendor lane."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/vendor-capabilities">
            <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
              Capability lanes
              <Sparkles className="size-4" />
            </Button>
          </Link>
          <Link href="/dashboard/vendor-requests">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Requests
              <ClipboardList className="size-4" />
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
            <div className="grid gap-6 xl:grid-cols-2">
              <Skeleton className="h-[26rem] rounded-[28px]" />
              <Skeleton className="h-[26rem] rounded-[28px]" />
            </div>
          </>
        ) : (
          <>
            <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_38%),linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef5ff_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.14)] bg-white/80 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                    <Waypoints className="size-3.5" />
                    Live studio dashboard
                  </div>
                  <h2 className="mt-4 font-display text-3xl tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
                    Keep your lanes visible, your work protected, and your payouts moving.
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                    This space turns your vendor account into a studio board. You can see which capability lanes are approved, how much work is waiting, and whether today&apos;s delivery flow is already protected.
                  </p>

                  <div className="mt-6">
                    <ActionSummaryStrip
                      title="Where the studio needs attention next"
                      items={[
                        {
                          eyebrow: 'Review coverage',
                          value: formatPercent(studioCoverage),
                          detail:
                            summary.pending_capabilities > 0
                              ? `${summary.pending_capabilities} capability lane${summary.pending_capabilities === 1 ? '' : 's'} still waiting for admin review.`
                              : 'Approved lanes are already carrying the studio.',
                          icon: <ShieldCheck className="size-4" />,
                          tone: 'guidance',
                        },
                        {
                          eyebrow: 'Demand pressure',
                          value: String(summary.open_requests),
                          detail:
                            summary.open_requests > 0
                              ? 'Matched requests are open right now. Review them before they age out.'
                              : 'No new matched requests are waiting right now.',
                          icon: <ClipboardList className="size-4" />,
                          tone: 'activity',
                        },
                        {
                          eyebrow: 'Wallet ready',
                          value: formatMoney(summary.available_balance_minor, summary.currency),
                          detail:
                            summary.available_balance_minor > 0
                              ? 'Confirmed vendor balance is ready for the withdrawal lane.'
                              : 'Payout balance will appear here after protected work clears.',
                          icon: <WalletCards className="size-4" />,
                          tone: 'finance',
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/90 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Studio pressure</p>
                    <div className="mt-4 space-y-4">
                      {[
                        {
                          label: 'Approved capability coverage',
                          value: studioCoverage,
                          tone: 'var(--accent-teal)',
                        },
                        {
                          label: 'Protected delivery coverage',
                          value: deliveryProtection,
                          tone: 'var(--accent-cyan)',
                        },
                        {
                          label: 'Current workload pressure',
                          value: demandPressure,
                          tone: 'var(--accent-amber)',
                        },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-[var(--text-secondary)]">{item.label}</p>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">{formatPercent(item.value)}</span>
                          </div>
                          <div className="mt-2 h-2.5 rounded-full bg-[rgba(226,232,240,0.9)]">
                            <div className="h-2.5 rounded-full" style={{ width: `${Math.min(item.value, 100)}%`, backgroundColor: item.tone }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link href="/dashboard/vendor-capabilities">
                      <Button className="h-full w-full justify-between rounded-[22px] bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
                        Open capability lanes
                        <Sparkles className="size-4" />
                      </Button>
                    </Link>
                    <Link href="/dashboard/vendor-withdrawals">
                      <Button variant="ghost" className="h-full w-full justify-between rounded-[22px] border border-[var(--line)] px-4 py-5">
                        Open withdrawals
                        <WalletCards className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">Studio signals</p>
                <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Read the four numbers that shape today&apos;s vendor lane</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                eyebrow="Approved lanes"
                value={String(summary.approved_capabilities)}
                detail="Capability lanes already cleared to receive matching requests."
                icon={<ShieldCheck className="size-5" />}
                variant="activity"
              />
              <StatCard
                eyebrow="Open requests"
                value={String(summary.open_requests)}
                detail="Matched request opportunities currently visible to this studio."
                icon={<ClipboardList className="size-5" />}
                variant="market"
              />
              <StatCard
                eyebrow="Active bookings"
                value={String(summary.active_bookings)}
                detail="Assignments already in motion with admin-managed work coordination."
                icon={<BriefcaseBusiness className="size-5" />}
                variant="communication"
              />
              <StatCard
                eyebrow="Available balance"
                value={formatMoney(summary.available_balance_minor, summary.currency)}
                detail="Vendor funds ready for the payout lane once you decide to withdraw."
                icon={<WalletCards className="size-5" />}
                variant="finance"
              />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">Visual maps</p>
                <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Use graphics to see readiness and work pressure faster</h3>
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
              <MiniDistributionCard
                eyebrow="Capability map"
                title="See which lanes are already market-ready"
                description="This graphic shows how your active capability lanes are split between approved, waiting review, and returned-for-changes lanes."
                items={[
                  { label: 'Approved', value: summary.approved_capabilities, accent: 'var(--accent-teal)' },
                  { label: 'Pending review', value: summary.pending_capabilities, accent: 'var(--accent-amber)' },
                  { label: 'Returned', value: summary.returned_capabilities, accent: 'var(--accent-coral)' },
                ]}
              />

              <MiniDistributionCard
                eyebrow="Work pipeline"
                title="Read demand and protected delivery at one glance"
                description="This map separates opportunities that need proposals, work already assigned, and bookings that already have protected escrow cover."
                items={[
                  { label: 'Open requests', value: summary.open_requests, accent: 'var(--accent-amber)' },
                  { label: 'Active bookings', value: summary.active_bookings, accent: 'var(--accent-cyan)' },
                  { label: 'Protected bookings', value: summary.protected_bookings, accent: 'var(--accent-teal)' },
                ]}
              />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">Working lanes</p>
                <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Open only the lane that matches the next studio action</h3>
              </div>
              <div className="grid gap-6 xl:grid-cols-4">
              <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Lane 1</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Shape your capability mix</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Keep capability lanes active, polished, and admin-approved so matching demand can keep reaching you.</p>
                <div className="mt-auto pt-5">
                  <Link href="/dashboard/vendor-capabilities">
                    <Button className="w-full justify-between">
                      Open capability lanes
                      <Sparkles className="size-4" />
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Lane 2</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Review live request demand</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Open matched requests, send clean proposals, and keep your studio visible where new work is waiting.</p>
                <div className="mt-auto pt-5">
                  <Link href="/dashboard/vendor-requests">
                    <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                      Open requests
                      <ClipboardList className="size-4" />
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Lane 3</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Keep delivery conversations moving</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Use bookings and inbox only for work already assigned, protected, and actively moving toward delivery.</p>
                <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-1">
                  <Link href="/dashboard">
                    <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                      Open bookings
                      <BriefcaseBusiness className="size-4" />
                    </Button>
                  </Link>
                  <Link href="/dashboard/communications">
                    <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                      Open inbox
                      <MessagesSquare className="size-4" />
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Lane 4</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Move confirmed balance out</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Request payout only after protected work clears and the studio wallet is ready to move into mobile money.</p>
                <div className="mt-auto pt-5">
                  <Link href="/dashboard/vendor-withdrawals">
                    <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                      Open withdrawals
                      <WalletCards className="size-4" />
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
