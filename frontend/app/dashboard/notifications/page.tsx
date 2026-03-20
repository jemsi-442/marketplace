'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

export default function NotificationsPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const notifications = useQuery({
    queryKey: ['notifications-page', token],
    queryFn: () => apiClient.getNotifications(token ?? ''),
    enabled: Boolean(token),
  });

  const markRead = useMutation({
    mutationFn: async (notificationId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.markNotificationRead(token, notificationId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications-page'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-notifications'] }),
      ]);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to mark notification as read');
    },
  });

  const visibleNotifications = useMemo(() => {
    const items = notifications.data ?? [];
    return filter === 'unread' ? items.filter((item) => !item.isRead) : items;
  }, [filter, notifications.data]);

  const unreadCount = notifications.data?.filter((item) => !item.isRead).length ?? 0;

  return (
    <DashboardShell
      title="Notification center"
      subtitle="This rail keeps operational alerts visible and actionable. It is wired to the live Symfony notification endpoint, including read acknowledgements."
    >
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Alert feed</p>
            <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">User-facing system signals</h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {unreadCount} unread notification{unreadCount === 1 ? '' : 's'} across the current user session.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant={filter === 'all' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('all')}>
              All
            </Button>
            <Button variant={filter === 'unread' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('unread')}>
              Unread
            </Button>
          </div>
        </div>

        {feedback ? (
          <div className="mt-5 rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-sm text-[var(--text-primary)]">
            {feedback}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {notifications.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading notifications...</p> : null}
          {notifications.isError ? <p className="text-sm text-rose-300">{notifications.error instanceof Error ? notifications.error.message : 'Unable to load notifications'}</p> : null}
          {visibleNotifications.map((notification) => (
            <div key={notification.id} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{notification.createdAt}</p>
                  <p className="mt-2 font-display text-xl text-[var(--text-primary)]">{notification.title}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{notification.message}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--brand-secondary)]">
                    {notification.isRead ? 'read' : 'unread'}
                  </div>
                  {!notification.isRead ? (
                    <Button size="sm" variant="ghost" onClick={() => markRead.mutate(notification.id)} disabled={markRead.isPending}>
                      Mark as read
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {!notifications.isLoading && !visibleNotifications.length ? (
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5 text-sm text-[var(--text-secondary)]">
              {filter === 'unread' ? 'No unread notifications right now.' : 'No notifications yet.'}
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="mt-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--panel-muted)] text-[var(--brand-secondary)]">
            <BellRing className="size-5" />
          </div>
          <div>
            <p className="font-display text-xl text-[var(--text-primary)]">Operational note</p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              This page is ready for future fraud, payout, and dispute alerts. As backend event emitters mature, the same UI can surface risk escalations without changing the surrounding workflow.
            </p>
          </div>
        </div>
      </Card>
    </DashboardShell>
  );
}
