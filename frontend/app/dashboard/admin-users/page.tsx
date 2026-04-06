'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type { AdminUserRecord } from '@/lib/types';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

type UserFilter = 'all' | 'client' | 'vendor' | 'admin' | 'locked' | 'unverified';

const FILTER_LABELS: Array<{ value: UserFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'client', label: 'Clients' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'admin', label: 'Admins' },
  { value: 'locked', label: 'Locked' },
  { value: 'unverified', label: 'Unverified' },
];

const PAGE_SIZE = 10;
const ADMIN_USERS_STALE_MS = 60_000;

function getAccountTypeLabel(type: AdminUserRecord['account_type']): string {
  switch (type) {
    case 'super_admin':
      return 'Super admin';
    case 'admin':
      return 'Admin';
    case 'vendor':
      return 'Vendor';
    default:
      return 'Client';
  }
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-TZ');
}

export default function AdminUsersPage() {
  const token = useAuthStore((state) => state.token);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [page, setPage] = useState(1);

  const users = useQuery({
    queryKey: ['admin-users', token, search, filter, page],
    queryFn: () =>
      apiClient.getAdminUsers(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search: search.trim(),
        view: filter,
      }),
    enabled: Boolean(token),
    staleTime: ADMIN_USERS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
  const summary = users.data?.summary ?? {
    total: 0,
    clients: 0,
    vendors: 0,
    admins: 0,
    locked: 0,
    unverified: 0,
  };
  const paginatedUsers = users.data?.items ?? [];
  const totalPages = users.data?.total_pages ?? 1;
  const currentPage = Math.min(page, totalPages);

  const applyFilter = (nextFilter: UserFilter) => {
    setFilter(nextFilter);
    setPage(1);
  };

  return (
    <DashboardShell
      title="Users"
      subtitle="Keep the list here. Open a user page only when you need to manage one account."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/admin">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Back to admin
              <ArrowRight className="size-4 rotate-180" />
            </Button>
          </Link>
          <Link href="/dashboard/admin-users/new">
            <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
              New user
              <Users className="size-4" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {feedback ? <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} /> : null}

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <button
            type="button"
            onClick={() => applyFilter('all')}
            className={`text-left ${filter === 'all' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Total users</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.total}</p>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => applyFilter('client')}
            className={`text-left ${filter === 'client' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Clients</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.clients}</p>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => applyFilter('vendor')}
            className={`text-left ${filter === 'vendor' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Vendors</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.vendors}</p>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => applyFilter('admin')}
            className={`text-left ${filter === 'admin' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Admins</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.admins}</p>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => applyFilter('locked')}
            className={`text-left ${filter === 'locked' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Locked</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.locked}</p>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => applyFilter('unverified')}
            className={`text-left ${filter === 'unverified' ? 'translate-y-[-1px]' : ''}`}
          >
            <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Unverified</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.unverified}</p>
            </Card>
          </button>
        </div>

        <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">User list</p>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">One page per account</h2>
            </div>
            <Link href="/dashboard/admin-users/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">New user</Button>
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <Search className="size-4 text-[var(--text-secondary)]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search users"
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

          <div className="mt-4 space-y-3">
            {users.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[22px]" />)}
              </div>
            ) : users.isError ? (
              <EmptyState icon={<Users className="size-5" />} title="Users are not loading right now" description="Refresh and try again in a moment." />
            ) : !paginatedUsers.length ? (
              <EmptyState
                icon={<Users className="size-5" />}
                title="No users in this view"
                description="Change the search or filter, or create a new account from the new user page."
                action={
                  <Link href="/dashboard/admin-users/new" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto">Open new user page</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {paginatedUsers.map((target) => {
                  return (
                    <div key={target.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold text-[var(--text-primary)]">{target.email}</p>
                            <StatusBadge label={getAccountTypeLabel(target.account_type)} tone="info" />
                            {target.is_verified ? <StatusBadge label="Verified" tone="success" /> : <StatusBadge label="Unverified" tone="warning" />}
                            {target.is_locked ? <StatusBadge label="Locked" tone="warning" /> : <StatusBadge label="Active" tone="success" />}
                          </div>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">Created: {formatDateTime(target.created_at)}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link href={`/dashboard/admin-users/${target.id}`} className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto" variant="ghost">Open user</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}

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
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
