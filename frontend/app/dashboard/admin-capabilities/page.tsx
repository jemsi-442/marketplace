'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, BriefcaseBusiness, Layers3, Search, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type { VendorServiceCapabilityRecord } from '@/lib/types';

type CapabilityFilter = 'all' | 'pending' | 'approved' | 'returned';

const FILTER_LABELS: Array<{ value: CapabilityFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'returned', label: 'Returned' },
];

const PAGE_SIZE = 10;
const ADMIN_CAPABILITIES_STALE_MS = 60_000;

function formatMoney(amount?: number | null, currency = 'TZS'): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '--';
  }

  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-TZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getReviewTone(record: VendorServiceCapabilityRecord): 'success' | 'warning' | 'info' {
  if (record.approved_by_admin) {
    return 'success';
  }

  if (record.review_state === 'returned') {
    return 'warning';
  }

  return 'info';
}

function getReviewLabel(record: VendorServiceCapabilityRecord): string {
  if (record.approved_by_admin) {
    return 'Approved';
  }

  if (record.review_state === 'returned') {
    return 'Returned';
  }

  return 'Pending review';
}

function resolveCapabilityLaneLabel(record: VendorServiceCapabilityRecord): string {
  return record.service_type.group_title || record.service_type.category || 'Other capability lane';
}

export default function AdminCapabilitiesPage() {
  const token = useAuthStore((state) => state.token);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CapabilityFilter>('all');
  const [page, setPage] = useState(1);

  const capabilities = useQuery({
    queryKey: ['admin-vendor-capabilities', token, { page, search, filter }],
    queryFn: () =>
      apiClient.getAdminVendorCapabilities(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search: search.trim(),
        view: filter,
      }),
    enabled: Boolean(token),
    staleTime: ADMIN_CAPABILITIES_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const summary = capabilities.data?.summary ?? {
    total: 0,
    pending: 0,
    approved: 0,
    returned: 0,
  };
  const items = capabilities.data?.items ?? [];
  const totalPages = capabilities.data?.total_pages ?? 1;
  const currentPage = Math.min(page, totalPages);
  const groupedItems = items.reduce<Array<{ lane: string; items: VendorServiceCapabilityRecord[] }>>((groups, capability) => {
    const lane = resolveCapabilityLaneLabel(capability);
    const existing = groups.find((entry) => entry.lane === lane);

    if (existing) {
      existing.items.push(capability);
      return groups;
    }

    groups.push({ lane, items: [capability] });
    return groups;
  }, []);
  const visibleLaneCount = groupedItems.length;

  const applyFilter = (nextFilter: CapabilityFilter) => {
    setFilter(nextFilter);
    setPage(1);
  };

  return (
    <DashboardShell
      title="Capability lanes"
      subtitle="Review vendor lanes here before those capabilities start receiving matched work."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/admin">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Back to admin
              <ArrowRight className="size-4 rotate-180" />
            </Button>
          </Link>
          <Link href="/dashboard/admin-requests">
            <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
              Open requests
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.10),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8faff_55%,#eef3ff_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.16)] bg-white/84 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                <ShieldCheck className="size-3.5" />
                Capability review desk
              </div>
              <h2 className="mt-4 font-display text-3xl tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
                Review capability lanes with the same business structure vendors now use.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                Grouped lane review helps you read price, proof, and delivery clarity in business context before a capability starts feeding matched work.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Visible lanes', value: String(visibleLaneCount) },
                  { label: 'Pending pressure', value: String(summary.pending) },
                  { label: 'Returned lanes', value: String(summary.returned) },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white/82 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.label}</p>
                    <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Lane review rhythm</p>
              <div className="mt-4 space-y-3">
                {[
                  {
                    title: 'Start with pressure',
                    detail: 'Use pending and returned states to find where admin guidance is needed first.',
                    icon: <Layers3 className="size-4" />,
                  },
                  {
                    title: 'Read one lane together',
                    detail: 'Compare capabilities inside the same business lane before deciding whether proof and price are coherent.',
                    icon: <Sparkles className="size-4" />,
                  },
                ].map((item) => (
                  <div key={item.title} className="h-full rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-2xl bg-[rgba(99,102,241,0.10)] text-[var(--brand-primary)]">
                        {item.icon}
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-primary)]">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <button type="button" onClick={() => applyFilter('all')} className={`text-left ${filter === 'all' ? 'translate-y-[-1px]' : ''}`}>
            <Card className="h-full rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Total lanes</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.total}</p>
            </Card>
          </button>
          <button type="button" onClick={() => applyFilter('pending')} className={`text-left ${filter === 'pending' ? 'translate-y-[-1px]' : ''}`}>
            <Card className="h-full rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Pending</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.pending}</p>
            </Card>
          </button>
          <button type="button" onClick={() => applyFilter('approved')} className={`text-left ${filter === 'approved' ? 'translate-y-[-1px]' : ''}`}>
            <Card className="h-full rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Approved</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.approved}</p>
            </Card>
          </button>
          <button type="button" onClick={() => applyFilter('returned')} className={`text-left ${filter === 'returned' ? 'translate-y-[-1px]' : ''}`}>
            <Card className="h-full rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Returned</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.returned}</p>
            </Card>
          </button>
        </div>

        <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
          <div className="mb-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Capability review</p>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Open one lane, then review one capability at a time</h2>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <Search className="size-4 text-[var(--text-secondary)]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search vendor, service, or category"
                className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTER_LABELS.map((option) => {
                const active = filter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => applyFilter(option.value)}
                    className={active
                      ? 'rounded-full border border-[rgba(79,70,229,0.18)] bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(79,70,229,0.18)]'
                      : 'rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {capabilities.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-[22px]" />)}
              </div>
            ) : capabilities.isError ? (
              <EmptyState icon={<BriefcaseBusiness className="size-5" />} title="Capabilities are not loading right now" description="Refresh and try again in a moment." />
            ) : !items.length ? (
              <EmptyState
                icon={<BriefcaseBusiness className="size-5" />}
                title="No capabilities in this view"
                description="Change the filter or search to review another vendor lane."
              />
            ) : (
              <div className="space-y-5">
                {groupedItems.map((group) => (
                  <div key={group.lane} className="space-y-3">
                    <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Capability lane</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{group.lane}</h3>
                        <StatusBadge label={`${group.items.length} in this lane`} tone="info" />
                      </div>
                    </div>

                    {group.items.map((capability) => (
                      <div key={capability.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold text-[var(--text-primary)]">{capability.service_type.name}</p>
                              <StatusBadge label={getReviewLabel(capability)} tone={getReviewTone(capability)} />
                              <StatusBadge label={capability.capacity_status} tone="info" />
                            </div>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              {capability.vendor?.company_name || capability.vendor?.email || 'Vendor profile'} • {capability.service_type.category || group.lane}
                            </p>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              Price: {formatMoney(capability.starting_price_minor)} • Experience: {capability.experience_level}
                            </p>

                            {capability.reviewed_at ? (
                              <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
                                <p>
                                  Last review: <span className="font-medium text-[var(--text-primary)]">{formatDateTime(capability.reviewed_at)}</span>
                                </p>
                                <p className="mt-1">
                                  Reviewed by:{' '}
                                  <span className="font-medium text-[var(--text-primary)]">
                                    {capability.reviewed_by_admin?.email || 'WOLFIX admin'}
                                  </span>
                                </p>
                                {capability.admin_review_note ? (
                                  <p className="mt-2 text-[var(--text-secondary)]">Note: {capability.admin_review_note}</p>
                                ) : null}
                              </div>
                            ) : capability.admin_review_note ? (
                              <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
                                <p>Note: {capability.admin_review_note}</p>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link href={`/dashboard/admin-capabilities/${capability.id}`}>
                              <Button variant="ghost">Open lane review</Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length ? (
            <div className="mt-6 flex items-center justify-between border-t border-[var(--line)] pt-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  Previous
                </Button>
                <Button variant="ghost" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </DashboardShell>
  );
}
