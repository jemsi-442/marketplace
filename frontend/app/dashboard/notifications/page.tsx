'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BellRing, Landmark, MessageSquareMore, Search, ShieldAlert, WalletCards } from 'lucide-react';
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
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';
import { useToastStore } from '@/lib/ui/toast-store';

type NotificationCategory = 'all' | 'finance' | 'escrow' | 'message' | 'risk' | 'platform';

const PAGE_SIZE = 10;
const NOTIFICATIONS_STALE_MS = 60_000;

const categoryMeta = {
  all: { label: 'All', icon: BellRing },
  finance: { label: 'Finance', icon: Landmark },
  escrow: { label: 'Escrow', icon: WalletCards },
  message: { label: 'Messages', icon: MessageSquareMore },
  risk: { label: 'Risk', icon: ShieldAlert },
  platform: { label: 'Platform', icon: AlertTriangle },
} satisfies Record<NotificationCategory, { label: string; icon: typeof BellRing }>;

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('en-TZ');
}

export default function NotificationsPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory>('all');
  const [notificationSearch, setNotificationSearch] = useState('');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingNotificationId, setPendingNotificationId] = useState<number | null>(null);

  const notifications = useQuery({
    queryKey: ['notifications-page', token, filter, categoryFilter, notificationSearch, page],
    queryFn: () =>
      apiClient.getNotifications(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search: notificationSearch.trim(),
        view: filter,
        category: categoryFilter,
      }),
    enabled: Boolean(token),
    staleTime: NOTIFICATIONS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const markRead = useMutation({
    mutationFn: async (notificationId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }
      setPendingNotificationId(notificationId);
      return apiClient.markNotificationRead(token, notificationId);
    },
    onSuccess: async () => {
      setFeedback('Alert marked as read.');
      pushToast({ title: 'Alert updated', message: 'The alert was marked as read.', tone: 'success' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications-page'] }),
        queryClient.invalidateQueries({ queryKey: ['notification-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-shell-summary'] }),
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to mark alert as read';
      setFeedback(message);
      pushToast({ title: 'Alert update failed', message, tone: 'danger' });
    },
    onSettled: () => {
      setPendingNotificationId(null);
    },
  });

  const paginatedNotifications = notifications.data?.items ?? [];
  const unreadCount = notifications.data?.summary.unread ?? 0;
  const totalPages = notifications.data?.total_pages ?? 1;
  const currentPage = Math.min(page, totalPages);

  const applyReadFilter = (nextFilter: typeof filter) => {
    setFilter(nextFilter);
    setPage(1);
  };

  const applyCategoryFilter = (nextFilter: NotificationCategory) => {
    setCategoryFilter(nextFilter);
    setPage(1);
  };

  return (
    <DashboardShell
      title="Alerts"
      subtitle="Read alerts here, then open the related page only when the alert still needs attention."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            size="sm"
            variant="ghost"
            className="w-full rounded-2xl border border-[var(--line)]"
            onClick={() => applyReadFilter(filter === 'unread' ? 'all' : 'unread')}
          >
            {filter === 'unread' ? 'Show all' : 'Show unread'}
          </Button>
          <Link href="/dashboard/communications">
            <Button size="sm" variant="ghost" className="w-full rounded-2xl border border-[var(--line)]">Open inbox</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {feedback ? <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} /> : null}

        <div className="grid gap-4 md:grid-cols-3">
          <button type="button" onClick={() => applyReadFilter('all')} className={`text-left ${filter === 'all' ? 'translate-y-[-1px]' : ''}`}>
            <Card className="rounded-[22px] border border-[rgba(15,23,42,0.08)] p-4 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">All alerts</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{notifications.data?.summary.total ?? 0}</p>
            </Card>
          </button>
          <button type="button" onClick={() => applyReadFilter('unread')} className={`text-left ${filter === 'unread' ? 'translate-y-[-1px]' : ''}`}>
            <Card className="rounded-[22px] border border-[rgba(15,23,42,0.08)] p-4 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Unread</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{unreadCount}</p>
            </Card>
          </button>
          <button type="button" onClick={() => {
            applyReadFilter('all');
            applyCategoryFilter('all');
          }} className="text-left">
            <Card className="rounded-[22px] border border-[rgba(15,23,42,0.08)] p-4 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Visible</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{notifications.data?.summary.visible ?? 0}</p>
            </Card>
          </button>
        </div>

        <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <Search className="size-4 text-[var(--text-secondary)]" />
                <input
                  value={notificationSearch}
                  onChange={(event) => {
                    setNotificationSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search alerts"
                  className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(categoryMeta) as Array<[NotificationCategory, { label: string; icon: typeof BellRing }]>).map(([key, meta]) => {
                  const active = categoryFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyCategoryFilter(key)}
                      className={active ? 'rounded-full border border-[var(--brand-primary)] bg-[rgba(59,130,246,0.10)] px-4 py-2 text-sm font-medium text-[var(--brand-primary)]' : 'rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)]'}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[220px]" />
          </div>
        </Card>

        <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Alert list</p>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Read one alert at a time</h2>
          </div>

          <div className="mt-5 space-y-3">
            {notifications.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[22px]" />)
            ) : null}

            {!notifications.isLoading && paginatedNotifications.length === 0 ? (
              <EmptyState icon={<BellRing className="size-5" />} title="No alerts in this view" description="Change the search or filter, or wait for the next platform alert." />
            ) : null}

            {paginatedNotifications.map((notification) => {
              const category = (notification.category && notification.category in categoryMeta
                ? notification.category
                : 'platform') as Exclude<NotificationCategory, 'all'>;
              const meta = categoryMeta[category];
              const Icon = meta.icon;

              return (
                <div key={notification.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div className="flex size-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-white text-[var(--brand-primary)]">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-[var(--text-primary)]">{notification.title}</p>
                          {!notification.isRead ? <StatusBadge label="Unread" tone="warning" /> : <StatusBadge label="Read" tone="neutral" />}
                          <StatusBadge label={meta.label} tone="info" />
                        </div>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{notification.message}</p>
                        <p className="mt-3 text-xs text-[var(--text-secondary)]">{formatDateTime(notification.createdAt)}</p>
                      </div>
                    </div>
                    {!notification.isRead ? (
                      <Button className="w-full sm:w-auto" size="sm" onClick={() => markRead.mutate(notification.id)} disabled={markRead.isPending && pendingNotificationId === notification.id}>
                        {markRead.isPending && pendingNotificationId === notification.id ? 'Updating...' : 'Mark read'}
                      </Button>
                    ) : null}
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
        </Card>
      </div>
    </DashboardShell>
  );
}
