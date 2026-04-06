'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

const PAGE_SIZE = 10;

function getRequestTone(status: string): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'awaiting_payment':
      return 'warning';
    case 'funded':
    case 'completed':
      return 'success';
    case 'vendor_interest_open':
    case 'vendor_selected':
    case 'revision_requested':
    case 'delivery_submitted':
      return 'info';
    default:
      return 'neutral';
  }
}

export default function ClientRequestsPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const isClient = !isAdmin && !isVendor;
  const [statusView, setStatusView] = useState<'all' | 'active' | 'awaiting_payment' | 'completed'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isClient) {
      router.replace(isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard');
    }
  }, [isAdmin, isClient, isVendor, router, user]);

  const requests = useQuery({
    queryKey: ['client-requests', token, { page, statusView }],
    queryFn: () => apiClient.getClientRequests(token ?? '', { page, limit: PAGE_SIZE, view: statusView }),
    enabled: Boolean(token),
  });
  const summary = requests.data?.summary ?? {
    total: 0,
    active: 0,
    awaiting_payment: 0,
    completed: 0,
  };
  const currentPage = requests.data?.page ?? page;
  const totalPages = requests.data?.total_pages ?? 1;
  const requestItems = requests.data?.items ?? [];

  const applyStatusView = (nextView: typeof statusView) => {
    setStatusView(nextView);
    setPage(1);
  };

  return (
    <DashboardShell
      title="Requests"
      subtitle="Track the service requests you already sent to WOLFIX. Open one request to read admin updates, pricing, timing, and the next clean action."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/request-services">
            <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
              New request
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Open bookings
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            onClick={() => applyStatusView('active')}
            className={`text-left ${statusView === 'active' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Active</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.active}</p>
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
          <button
            type="button"
            onClick={() => applyStatusView('completed')}
            className={`text-left ${statusView === 'completed' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Completed</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.completed}</p>
            </Card>
          </button>
        </div>

        <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'awaiting_payment', label: 'Awaiting payment' },
              { value: 'completed', label: 'Completed' },
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

          {requests.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-36 rounded-[24px]" />
              ))}
            </div>
          ) : requests.isError ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="Requests are not loading right now"
              description="Refresh and try again in a moment."
            />
          ) : !summary.total ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="No requests yet"
              description="Start from the business lanes page, choose the exact lane brief you need, then send your first request."
              action={
                <Link href="/dashboard/request-services">
                  <Button>Open lanes</Button>
                </Link>
              }
            />
          ) : !requestItems.length ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="No requests in this view"
              description="Try another filter to bring the right request lane into view."
            />
          ) : (
            <div className="space-y-4">
              {requestItems.map((request) => (
                <div
                  key={request.id}
                  className="grid gap-4 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,252,0.92)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] lg:grid-cols-[minmax(0,1.2fr)_220px_220px]"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--brand-primary)]">{request.service_type.category ?? 'Digital service'}</p>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{request.service_type.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{request.request_summary}</p>
                  </div>
                  <div className="h-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Status</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge label={request.status} tone={getRequestTone(request.status)} />
                      {typeof request.unread_thread_count === 'number' && request.unread_thread_count > 0 ? (
                        <StatusBadge label={`${request.unread_thread_count} unread`} tone="warning" />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-start lg:h-full lg:justify-end">
                    <Link href={`/dashboard/requests/${request.id}`} className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto">
                        Open request
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
