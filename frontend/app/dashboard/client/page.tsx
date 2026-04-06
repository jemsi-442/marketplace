'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Compass, ShieldCheck, WalletCards, Waypoints } from 'lucide-react';

import { MiniDistributionCard } from '@/components/dashboard/mini-distribution-card';
import { MiniTrendCard } from '@/components/dashboard/mini-trend-card';
import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionSummaryStrip } from '@/components/ui/action-summary-strip';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

const HOME_SUMMARY_STALE_MS = 60_000;

const popularCategories = [
  'Website Development',
  'Mobile App Development',
  'Social Media Management',
  'Bulk SMS & Messaging Solutions',
  'Government Consultancy Services',
] as const;

function formatMoney(amountMinor: number, currency = 'TZS'): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function toShortBookingLabel(value: string, index: number): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }

  return `B${index + 1}`;
}

export default function ClientWelcomePage() {
  const token = useAuthStore((state) => state.token);

  const summary = useQuery({
    queryKey: ['client-dashboard-summary', token],
    queryFn: () => apiClient.getClientDashboardSummary(token ?? ''),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
  });

  const data = summary.data ?? {
    visible_lane_count: 0,
    active_requests: 0,
    awaiting_payment_requests: 0,
    tracked_bookings: 0,
    active_bookings: 0,
    protected_bookings: 0,
    disputed_bookings: 0,
    protected_value_minor: 0,
    currency: 'TZS',
    recent_bookings: [],
  };

  const isLoading = summary.isLoading;
  const requestMomentum = Math.min((data.active_requests + data.awaiting_payment_requests) * 18, 100);
  const bookingProtection = data.tracked_bookings ? (data.protected_bookings / data.tracked_bookings) * 100 : 0;
  const disputePressure = Math.min(data.disputed_bookings * 28, 100);
  const recentBookingPoints = (data.recent_bookings ?? [])
    .slice()
    .reverse()
    .map((booking, index) => ({
      label: toShortBookingLabel(booking.created_at, index),
      value: booking.escrow?.amount_minor ?? 0,
    }));

  return (
    <DashboardShell
      title="Workspace"
      subtitle="Start with discovery, then follow your request, payment, and protected work flow from one client dashboard."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/request-services">
            <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
              Open lanes
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/dashboard/requests">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Open requests
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
            <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eefcff_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.18)] bg-white/82 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
                    <Waypoints className="size-3.5" />
                    Live client workspace
                  </div>
                  <h2 className="mt-4 font-display text-3xl tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
                    Discover the right lanes, protect live work, and watch your booking flow move clearly.
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                    This workspace brings lane discovery, request readiness, payment protection, and recent booking value into one place so the client side feels guided instead of scattered.
                  </p>

                  <div className="mt-6">
                    <ActionSummaryStrip
                      title="What your workspace needs next"
                      items={[
                        {
                          eyebrow: 'Discovery',
                          value: String(data.visible_lane_count),
                          detail:
                            data.visible_lane_count > 0
                              ? 'Active request lanes are visible and ready for new requests.'
                              : 'The request lanes will appear here as soon as active lanes are available.',
                          icon: <Compass className="size-4" />,
                          tone: 'guidance',
                        },
                        {
                          eyebrow: 'Requests in motion',
                          value: String(data.active_requests),
                          detail:
                            data.active_requests > 0
                              ? 'Your request lane has active work waiting for the next platform step.'
                              : 'No active requests are waiting right now.',
                          icon: <ClipboardList className="size-4" />,
                          tone: 'activity',
                        },
                        {
                          eyebrow: 'Protected value',
                          value: formatMoney(data.protected_value_minor, data.currency),
                          detail:
                            data.protected_value_minor > 0
                              ? 'Recent protected work already has escrow-linked value attached.'
                              : 'Protected booking value will appear here once payment is in motion.',
                          icon: <WalletCards className="size-4" />,
                          tone: 'finance',
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Workspace pressure</p>
                    <div className="mt-4 space-y-4">
                      {[
                        {
                          label: 'Request momentum',
                          value: requestMomentum,
                          tone: 'var(--accent-cyan)',
                        },
                        {
                          label: 'Booking protection',
                          value: bookingProtection,
                          tone: 'var(--accent-teal)',
                        },
                        {
                          label: 'Dispute pressure',
                          value: disputePressure,
                          tone: 'var(--accent-coral)',
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
                    <Link href="/dashboard/request-services">
                      <Button className="h-full w-full justify-between rounded-[22px] bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
                        Explore business lanes
                        <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button variant="ghost" className="h-full w-full justify-between rounded-[22px] border border-[var(--line)] px-4 py-5">
                        Open bookings
                        <ShieldCheck className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">Workspace signals</p>
                <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Read the four numbers that shape your client journey today</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                eyebrow="Business lanes"
                value={String(data.visible_lane_count)}
                detail="Active WOLFIX business lanes currently visible for fresh request discovery."
                icon={<Compass className="size-5" />}
                variant="market"
              />
              <StatCard
                eyebrow="Active requests"
                value={String(data.active_requests)}
                detail="Requests already moving through review, assignment, or delivery follow-up."
                icon={<ClipboardList className="size-5" />}
                variant="activity"
              />
              <StatCard
                eyebrow="Protected bookings"
                value={String(data.protected_bookings)}
                detail="Bookings already sitting inside escrow protection or later protected stages."
                icon={<ShieldCheck className="size-5" />}
                variant="communication"
              />
              <StatCard
                eyebrow="Awaiting payment"
                value={String(data.awaiting_payment_requests)}
                detail="Requests that already need the next client payment step to move forward."
                icon={<WalletCards className="size-5" />}
                variant="finance"
              />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">Visual maps</p>
                <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Use graphics to read discovery, protection, and value movement faster</h3>
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
              <MiniDistributionCard
                eyebrow="Request and booking flow"
                title="See where your client journey is currently sitting"
                description="This map separates requests needing progress, bookings already protected, and disputes that still need intervention."
                items={[
                  { label: 'Active requests', value: data.active_requests, accent: 'var(--accent-cyan)' },
                  { label: 'Protected bookings', value: data.protected_bookings, accent: 'var(--accent-teal)' },
                  { label: 'Disputed bookings', value: data.disputed_bookings, accent: 'var(--accent-coral)' },
                ]}
              />

              <MiniTrendCard
                eyebrow="Protected value trend"
                title="Watch the recent booking value passing through your workspace"
                description="These points follow the latest booking amounts already attached to your client lane."
                badge="Live booking flow"
                valueLabel="Window total"
                accent="var(--accent-cyan)"
                points={recentBookingPoints}
              />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">Working lanes</p>
                <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Open only the lane that matches the next step in your client journey</h3>
              </div>
              <div className="grid gap-6 xl:grid-cols-4">
                <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Lane 1</p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Discover the right business lane</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Start with the request lanes, compare fit, and choose the one that best matches what you want WOLFIX to handle.</p>
                  <div className="mt-auto pt-5">
                    <Link href="/dashboard/request-services">
                      <Button className="w-full justify-between">
                        Open lanes
                        <Compass className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>

                <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Lane 2</p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Send and follow requests</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Use the request lane to submit work clearly, then follow admin updates, pricing, and next platform instructions.</p>
                  <div className="mt-auto pt-5">
                    <Link href="/dashboard/requests">
                      <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                        Open requests
                        <ClipboardList className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>

                <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Lane 3</p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Track protected bookings</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Open bookings to monitor protected payment, delivery movement, and any dispute resolution tied to your live work.</p>
                  <div className="mt-auto pt-5">
                    <Link href="/dashboard">
                      <Button variant="ghost" className="w-full justify-between border border-[var(--line)]">
                        Open bookings
                        <ShieldCheck className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>

                <Card className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(34,197,94,0.10)] text-[#15803d]">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)]">Lane 4</p>
                      <h2 className="text-xl font-semibold text-[var(--text-primary)]">Start with a known lane</h2>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">If you want a faster start, jump straight into one of the business lanes clients open most often.</p>
                  <div className="mt-auto flex flex-wrap gap-3 pt-5">
                    {popularCategories.map((category) => (
                      <Link
                        key={category}
                        href={`/dashboard/request-services?category=${encodeURIComponent(category)}`}
                      >
                        <Button variant="ghost" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.08)]">
                          {category}
                        </Button>
                      </Link>
                    ))}
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
