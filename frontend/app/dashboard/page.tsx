'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, ClipboardList, MessagesSquare, Search } from 'lucide-react';
import { useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getBookingStatusTone, getEscrowStatusTone } from '@/lib/status';

const PAGE_SIZE = 10;
const BOOKINGS_PAGE_STALE_MS = 60_000;

function formatBuyerMoney(amount?: number | null, currency = 'TZS'): string {
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
    </Card>
  );
}

export default function DashboardBookingsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const homeHref = isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard/client';
  const [view, setView] = useState<'all' | 'active' | 'protected' | 'unread'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const bookings = useQuery({
    queryKey: ['dashboard-bookings-page', token, { page, view, search }],
    queryFn: () => apiClient.getBookings(token ?? '', { page, limit: PAGE_SIZE, view, search: search.trim() }),
    enabled: Boolean(token),
    staleTime: BOOKINGS_PAGE_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
  const summary = bookings.data?.summary ?? {
    total: 0,
    active: 0,
    protected: 0,
    unread: 0,
  };
  const currentPage = bookings.data?.page ?? page;
  const totalPages = bookings.data?.total_pages ?? 1;
  const bookingItems = bookings.data?.items ?? [];

  const applyView = (nextView: typeof view) => {
    setView(nextView);
    setPage(1);
  };

  return (
    <DashboardShell
      title="Bookings"
      subtitle="Open a booking when you need payment, delivery, or thread details."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={homeHref}>
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Back
              <BriefcaseBusiness className="size-4" />
            </Button>
          </Link>
          <Link href="/dashboard/communications">
            <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
              Open inbox
              <MessagesSquare className="size-4" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {bookings.isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-[24px]" />)
          ) : (
            <>
              <button type="button" onClick={() => applyView('active')} className={`text-left ${view === 'active' ? 'translate-y-[-1px]' : ''}`}>
                <SummaryCard label="Active bookings" value={String(summary.active)} />
              </button>
              <button type="button" onClick={() => applyView('protected')} className={`text-left ${view === 'protected' ? 'translate-y-[-1px]' : ''}`}>
                <SummaryCard label="Protected payments" value={String(summary.protected)} />
              </button>
              <button type="button" onClick={() => applyView('unread')} className={`text-left ${view === 'unread' ? 'translate-y-[-1px]' : ''}`}>
                <SummaryCard label="Unread updates" value={String(summary.unread)} />
              </button>
            </>
          )}
        </div>

        <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Booking list</p>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Open one booking at a time</h2>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <Search className="size-4 text-[var(--text-secondary)]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search booking, request, or service"
                className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'protected', label: 'Protected' },
                { value: 'unread', label: 'Unread' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => applyView(filter.value as typeof view)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    view === filter.value
                      ? 'border-[var(--brand-primary)] bg-[rgba(59,130,246,0.12)] text-[var(--brand-primary)]'
                      : 'border-[var(--line)] bg-white text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.08)]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
            {bookings.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[22px]" />)
            ) : bookings.isError ? (
              <EmptyState icon={<ClipboardList className="size-5" />} title="Bookings are not loading right now" description="Refresh and try again in a moment." />
            ) : !summary.total ? (
              <EmptyState icon={<ClipboardList className="size-5" />} title="No bookings yet" description="Open lanes or requests first, then come back here when work is active." />
            ) : !bookingItems.length ? (
              <EmptyState icon={<ClipboardList className="size-5" />} title="No bookings in this view" description="Try another filter to bring the right booking lane into view." />
            ) : (
              <>
              {bookingItems.map((booking) => (
                <div key={booking.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{booking.service_title}</p>
                        <StatusBadge label={booking.status} tone={getBookingStatusTone(booking.status)} />
                        {booking.escrow ? <StatusBadge label={booking.escrow.status} tone={getEscrowStatusTone(booking.escrow.status)} /> : null}
                        {typeof booking.unread_thread_count === 'number' && booking.unread_thread_count > 0 ? (
                          <StatusBadge label={`${booking.unread_thread_count} unread`} tone="warning" />
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{booking.request_summary}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                        <span>Booking #{booking.id}</span>
                        <span>{booking.service_category || 'General service'}</span>
                        <span>{booking.escrow ? formatBuyerMoney(booking.escrow.amount_minor, booking.escrow.currency) : 'Payment not protected yet'}</span>
                      </div>
                    </div>
                    <Link href={`/dashboard/bookings/${booking.id}`}>
                      <Button>
                        Open booking
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
                    <Button variant="ghost" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                      Previous
                    </Button>
                    <Button variant="ghost" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
              </>
            )}
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
