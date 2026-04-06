'use client';

import { useQuery } from '@tanstack/react-query';
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

function getRequestTone(status: string): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'awaiting_payment':
    case 'vendor_selected':
      return 'warning';
    case 'funded':
    case 'completed':
      return 'success';
    case 'vendor_interest_open':
    case 'matched':
      return 'info';
    default:
      return 'neutral';
  }
}

export default function AdminRequestsPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const [search, setSearch] = useState('');
  const [statusView, setStatusView] = useState<'all' | 'needs_review' | 'awaiting_payment'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, router, user]);

  const requests = useQuery({
    queryKey: ['admin-client-requests', token, { page, search, statusView }],
    queryFn: () =>
      apiClient.getAdminClientRequests(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search,
        view: statusView,
      }),
    enabled: Boolean(token) && isAdmin,
  });
  const summary = requests.data?.summary ?? {
    total: 0,
    open: 0,
    needs_review: 0,
    awaiting_payment: 0,
  };
  const currentPage = requests.data?.page ?? page;
  const totalPages = requests.data?.total_pages ?? 1;
  const requestItems = requests.data?.items ?? [];

  const applyStatusView = (nextView: typeof statusView) => {
    setStatusView(nextView);
    setPage(1);
  };

  const resultSummary =
    statusView === 'needs_review'
      ? 'Showing requests that still need proposal review and vendor selection'
      : statusView === 'awaiting_payment'
        ? 'Showing requests already prepared for client payment'
        : search.trim()
          ? `Showing requests for “${search.trim()}”`
          : 'Showing all request records';

  return (
    <DashboardShell
      title="Requests"
      subtitle="Review incoming client requests, compare vendor proposals, then prepare one clean payment-ready outcome for the client."
      mobileQuickActions={
        <div className="grid gap-3">
          <Link href="/dashboard/admin">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Back to operations
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
            onClick={() => applyStatusView('all')}
            className={`text-left ${statusView === 'all' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">All requests</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.total}</p>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => applyStatusView('needs_review')}
            className={`text-left ${statusView === 'needs_review' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Needs review</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.needs_review}</p>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => applyStatusView('awaiting_payment')}
            className={`text-left ${statusView === 'awaiting_payment' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Awaiting payment</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.awaiting_payment}</p>
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
                placeholder="Search service, client email, request summary..."
                className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'needs_review', label: 'Needs review' },
                { value: 'awaiting_payment', label: 'Awaiting payment' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => applyStatusView(filter.value as typeof statusView)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    statusView === filter.value
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
          {requests.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-[24px]" />
              ))}
            </div>
          ) : requests.isError ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="Requests are not loading right now"
              description="Refresh and try again in a moment."
            />
          ) : !requestItems.length ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title={summary.total ? 'No requests match this view' : 'No client requests yet'}
              description={
                summary.total
                  ? 'Try another filter or search to bring the right request queue into view.'
                  : 'New client requests will appear here once service requests start moving through the platform.'
              }
            />
          ) : (
            <div className="space-y-4">
              {requestItems.map((request) => (
                <div
                  key={request.id}
                  className="grid gap-4 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,252,0.92)] p-5 lg:grid-cols-[minmax(0,1.2fr)_240px_220px]"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--brand-primary)]">{request.service_type.category ?? 'Digital service'}</p>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{request.service_type.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{request.request_summary}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Client: {request.client.email}</p>
                  </div>
                  <div className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Request state</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge label={request.status} tone={getRequestTone(request.status)} />
                      {request.selected_vendor ? <StatusBadge label="Vendor selected" tone="warning" /> : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-start lg:justify-end">
                    <Link href={`/dashboard/admin-requests/${request.id}`} className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto">
                        Open request review
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
