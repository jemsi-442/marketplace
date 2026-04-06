'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardList, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

const PAGE_SIZE = 10;
const VENDOR_REQUESTS_STALE_MS = 60_000;

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

function getRequestTone(hasInterest: boolean): 'info' | 'success' {
  return hasInterest ? 'success' : 'info';
}

export default function VendorRequestsPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const [search, setSearch] = useState('');
  const [proposalView, setProposalView] = useState<'all' | 'needs_proposal' | 'sent'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isVendor) {
      router.replace(isAdmin ? '/dashboard/admin' : '/dashboard/client');
    }
  }, [isAdmin, isVendor, router, user]);

  const requestFeed = useQuery({
    queryKey: ['vendor-request-feed', token, { page, search, proposalView }],
    queryFn: () =>
      apiClient.getVendorRequestFeed(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search,
        view: proposalView,
      }),
    enabled: Boolean(token),
    staleTime: VENDOR_REQUESTS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
  const summary = requestFeed.data?.summary ?? {
    total: 0,
    needs_proposal: 0,
    sent: 0,
  };
  const currentPage = requestFeed.data?.page ?? page;
  const totalPages = requestFeed.data?.total_pages ?? 1;
  const requestItems = requestFeed.data?.items ?? [];

  const applyProposalView = (nextView: typeof proposalView) => {
    setProposalView(nextView);
    setPage(1);
  };

  const resultSummary =
    proposalView === 'needs_proposal'
      ? 'Showing requests that still need your proposal'
      : proposalView === 'sent'
        ? 'Showing requests where you already sent a proposal'
        : search.trim()
          ? `Showing request matches for “${search.trim()}”`
          : 'Showing all matched requests';

  return (
    <DashboardShell
      title="Requests"
      subtitle="Open matched work requests here, price them carefully, explain your price, and tell WOLFIX how long delivery will take."
      mobileQuickActions={
        <div className="grid gap-3">
          <Link href="/dashboard/vendor">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Back to workspace
              <ArrowRight className="size-4 rotate-180" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => applyProposalView('all')}
            className={`text-left ${proposalView === 'all' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">All requests</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.total}</p>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => applyProposalView('needs_proposal')}
            className={`text-left ${proposalView === 'needs_proposal' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Needs proposal</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.needs_proposal}</p>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => applyProposalView('sent')}
            className={`text-left ${proposalView === 'sent' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Proposal sent</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.sent}</p>
            </Card>
          </button>
        </div>

        <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
              <Search className="size-4 text-[var(--text-secondary)]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search website development, cybersecurity, licensing..."
                className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'needs_proposal', label: 'Needs proposal' },
                { value: 'sent', label: 'Proposal sent' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => applyProposalView(filter.value as typeof proposalView)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    proposalView === filter.value
                      ? 'border-[var(--brand-primary)] bg-[rgba(59,130,246,0.12)] text-[var(--brand-primary)]'
                      : 'border-[var(--line)] bg-white text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.08)]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <InlineStateNote tone="info" message={resultSummary} />
          </div>
          {requestFeed.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-44 rounded-[24px]" />
              ))}
            </div>
          ) : requestFeed.isError ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="Requests are not loading right now"
              description="Refresh and try again in a moment."
            />
          ) : !requestItems.length ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title={summary.total ? 'No requests match this view' : 'No matched requests yet'}
              description={
                summary.total
                  ? 'Try another search or switch the filter to see the rest of your request feed.'
                  : 'When this stays empty, WOLFIX may still be matching your capability lanes. Keep your workspace ready and check again soon.'
              }
              action={
                  <Link href="/dashboard/vendor" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto">Open workspace</Button>
                  </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {requestItems.map((request) => (
                <div
                  key={request.id}
                  className="grid gap-4 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,252,0.92)] p-5 lg:grid-cols-[minmax(0,1.1fr)_260px_210px]"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                      {request.service_type.category ?? 'Digital service'}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{request.service_type.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{request.request_summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {request.deadline_note ? <StatusBadge label={`Timing: ${request.deadline_note}`} tone="info" /> : null}
                      {request.budget_note ? <StatusBadge label={`Budget: ${request.budget_note}`} tone="neutral" /> : null}
                      {request.interest ? <StatusBadge label="Proposal sent" tone="success" /> : <StatusBadge label="Proposal needed" tone="info" />}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-[var(--line)] bg-white p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Your fit for this lane</p>
                    <div className="mt-3 space-y-2 text-sm text-[var(--text-primary)]">
                      <p>Experience: {request.capability.experience_level || 'Not stated yet'}</p>
                      <p>Starting price: {formatMoney(request.capability.starting_price_minor, 'TZS')}</p>
                      <p>Capacity: {request.capability.capacity_status || 'Not stated yet'}</p>
                      <p>Turnaround: {request.capability.turnaround_note || 'No default turnaround note yet'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start justify-between gap-4 lg:items-end">
                    <StatusBadge label={request.interest ? request.interest.status : request.status} tone={getRequestTone(Boolean(request.interest))} />
                    <Link href={`/dashboard/vendor-requests/${request.id}`} className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto">
                        {request.interest ? 'Open proposal' : 'Open request'}
                        <ArrowRight className="ml-2 size-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-4">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                      Previous
                    </Button>
                    <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
