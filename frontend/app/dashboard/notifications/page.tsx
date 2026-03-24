'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BellRing, Landmark, MessageSquareMore, Search, ShieldAlert, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { NextActionHint } from '@/components/ui/next-action-hint';
import { PriorityBanner } from '@/components/ui/priority-banner';
import { SectionNavigator } from '@/components/ui/section-navigator';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkflowSteps } from '@/components/ui/workflow-steps';
import { WorkspaceIdentityBanner } from '@/components/ui/workspace-identity-banner';
import { WorkspaceGuide } from '@/components/ui/workspace-guide';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { useToastStore } from '@/lib/ui/toast-store';
import type { NotificationRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

type NotificationCategory = 'all' | 'finance' | 'escrow' | 'message' | 'risk' | 'platform';

const categoryMeta = {
  all: { label: 'All', icon: BellRing },
  finance: { label: 'Finance', icon: Landmark },
  escrow: { label: 'Escrow', icon: WalletCards },
  message: { label: 'Messages', icon: MessageSquareMore },
  risk: { label: 'Risk', icon: ShieldAlert },
  platform: { label: 'Platform', icon: AlertTriangle },
} satisfies Record<NotificationCategory, { label: string; icon: typeof BellRing }>;

function detectNotificationCategory(notification: NotificationRecord): Exclude<NotificationCategory, 'all'> {
  if (
    notification.category === 'finance' ||
    notification.category === 'escrow' ||
    notification.category === 'message' ||
    notification.category === 'risk' ||
    notification.category === 'platform'
  ) {
    return notification.category;
  }

  const haystack = `${notification.title} ${notification.message}`.toLowerCase();

  if (haystack.includes('withdraw') || haystack.includes('payout') || haystack.includes('wallet') || haystack.includes('payment') || haystack.includes('fee')) {
    return 'finance';
  }

  if (haystack.includes('escrow') || haystack.includes('booking') || haystack.includes('release') || haystack.includes('dispute') || haystack.includes('refund')) {
    return 'escrow';
  }

  if (haystack.includes('message') || haystack.includes('inbox') || haystack.includes('conversation') || haystack.includes('reply')) {
    return 'message';
  }

  if (haystack.includes('risk') || haystack.includes('fraud') || haystack.includes('trust') || haystack.includes('lock') || haystack.includes('anomaly')) {
    return 'risk';
  }

  return 'platform';
}

function getNotificationActionHint(category: Exclude<NotificationCategory, 'all'>): string {
  switch (category) {
    case 'finance':
      return 'Open the related payout or payment workflow if money movement now needs attention.';
    case 'escrow':
      return 'Go to the booking or escrow workspace when the alert affects delivery confirmation or dispute state.';
    case 'message':
      return 'Open the inbox or the related booking if a reply or clarification is needed.';
    case 'risk':
      return 'Review the trust or account context carefully before taking any restrictive action.';
    default:
      return 'Read the alert fully, then move into the workspace it relates to if action is still needed.';
  }
}

export default function NotificationsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory>('all');
  const [notificationSearch, setNotificationSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const pushToast = useToastStore((state) => state.push);
  const isAdmin = user?.roles.includes('ROLE_ADMIN') ?? false;
  const isVendor = user?.roles.includes('ROLE_VENDOR') ?? false;
  const notificationsTone = isAdmin ? 'admin' : isVendor ? 'vendor' : 'client';

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
      pushToast({
        title: 'Alert updated',
        message: 'The notification was marked as read.',
        tone: 'success',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications-page'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-notifications'] }),
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to mark notification as read';
      setFeedback(message);
      pushToast({
        title: 'Alert update failed',
        message,
        tone: 'danger',
      });
    },
  });

  const visibleNotifications = useMemo(() => {
    const items = notifications.data ?? [];

    return items.filter((item) => {
      const category = detectNotificationCategory(item);
      const matchesReadState = filter === 'unread' ? !item.isRead : true;
      const matchesCategory = categoryFilter === 'all' ? true : category === categoryFilter;
      const searchHaystack = `${item.title} ${item.message}`.toLowerCase();
      const matchesSearch = notificationSearch.trim().length === 0 || searchHaystack.includes(notificationSearch.trim().toLowerCase());

      return matchesReadState && matchesCategory && matchesSearch;
    });
  }, [categoryFilter, filter, notificationSearch, notifications.data]);

  const unreadCount = notifications.data?.filter((item) => !item.isRead).length ?? 0;
  const categoryCounts = useMemo(() => {
    const counts: Record<Exclude<NotificationCategory, 'all'>, number> = {
      finance: 0,
      escrow: 0,
      message: 0,
      risk: 0,
      platform: 0,
    };

    for (const item of notifications.data ?? []) {
      counts[detectNotificationCategory(item)] += 1;
    }

    return counts;
  }, [notifications.data]);
  const highlightCards: Array<{ category: Exclude<NotificationCategory, 'all'>; count: number }> = [
    { category: 'finance', count: categoryCounts.finance },
    { category: 'escrow', count: categoryCounts.escrow },
    { category: 'message', count: categoryCounts.message },
    { category: 'risk', count: categoryCounts.risk },
  ];
  const currentFeedLabel =
    notificationSearch.trim().length > 0
      ? `Showing ${visibleNotifications.length} alert${visibleNotifications.length === 1 ? '' : 's'} for "${notificationSearch.trim()}" in the current alert view.`
      : categoryFilter === 'all'
      ? filter === 'unread'
        ? `Showing ${unreadCount} unread alert${unreadCount === 1 ? '' : 's'} from every lane.`
        : `Showing ${notifications.data?.length ?? 0} alert${(notifications.data?.length ?? 0) === 1 ? '' : 's'} from every lane.`
      : `Showing ${visibleNotifications.length} ${categoryMeta[categoryFilter].label.toLowerCase()} alert${visibleNotifications.length === 1 ? '' : 's'} in the current view.`;
  const hasAlertFilters = filter !== 'all' || categoryFilter !== 'all' || notificationSearch.trim().length > 0;
  const financeUnreadCount = useMemo(
    () => (notifications.data ?? []).filter((item) => !item.isRead && detectNotificationCategory(item) === 'finance').length,
    [notifications.data],
  );
  const riskUnreadCount = useMemo(
    () => (notifications.data ?? []).filter((item) => !item.isRead && detectNotificationCategory(item) === 'risk').length,
    [notifications.data],
  );
  const notificationsPriority = riskUnreadCount
    ? {
        title: 'Risk alerts should be reviewed before the rest of the alert queue',
        description: 'Start with unread risk signals so trust or account-safety decisions are never delayed behind lower-stakes updates.',
        tone: 'risk' as const,
      }
    : financeUnreadCount
      ? {
          title: 'Finance alerts are waiting for the next review',
          description: 'Open unread finance signals next so payment, payout, or wallet movement does not sit in the queue longer than necessary.',
          tone: 'finance' as const,
        }
      : unreadCount
        ? {
            title: 'Unread alerts are ready for a quick triage pass',
            description: 'Use the unread view first, then move into the related workspace only if the alert still needs action.',
            tone: 'activity' as const,
          }
        : hasAlertFilters
          ? {
              title: 'Your current alert filters are narrowing the view',
              description: 'Reset the alert view if you want to return to the full stream before deciding what deserves attention next.',
              tone: 'guidance' as const,
            }
          : {
              title: 'The alert queue is currently calm',
              description: 'No unread item is forcing the next move, so you can scan by category or return to the wider workspace deliberately.',
              tone: 'communication' as const,
            };

  function getNotificationActionLinks(category: Exclude<NotificationCategory, 'all'>): Array<{ href: string; label: string }> {
    switch (category) {
      case 'finance':
        return [{ href: isAdmin ? '/dashboard/admin' : '/dashboard/vendor', label: 'Open finance desk' }];
      case 'escrow':
        return [{ href: '/dashboard/client', label: 'Open bookings' }, { href: '/dashboard/bookings/1', label: 'Open booking desk' }];
      case 'message':
        return [{ href: '/dashboard/communications', label: 'Open inbox' }];
      case 'risk':
        return [{ href: isAdmin ? '/dashboard/admin' : '/dashboard', label: 'Open risk view' }];
      default:
        return [{ href: '/dashboard', label: 'Open overview' }];
    }
  }

  return (
    <DashboardShell
      title="Notification center"
      subtitle="Keep important marketplace alerts visible, organised, and easy to act on across finance, delivery, messages, and account safety."
      mobileQuickActions={
        <div className="grid grid-cols-3 gap-2">
          <Link href="#notifications-summary">
            <Button size="sm" variant="ghost" className="w-full">Summary</Button>
          </Link>
          <Link href="#notifications-feed">
            <Button size="sm" className="w-full">Feed</Button>
          </Link>
          <Link href="#notifications-note">
            <Button size="sm" variant="ghost" className="w-full">Guide</Button>
          </Link>
        </div>
      }
    >
      <div className="animate-fade-up">
        <WorkspaceGuide
        eyebrow="How to use notifications"
        title="This page helps you decide which alert needs attention first"
        description="Read the alert category and message first, then move into the related workspace only if the alert still needs action. Not every notification requires a response."
        points={[
          'Use unread alerts to see what changed recently.',
          'Use categories to separate finance, delivery, messages, risk, and platform signals.',
          'Mark an alert as read after you understand it, not before.',
          'If an alert is tied to live work, continue from the related booking, service, inbox, or operations desk.',
        ]}
        tip="Treat this page as your alert triage point. Understand first, then act in the correct workspace."
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '20ms' }}>
        <WorkspaceIdentityBanner
          tone={notificationsTone}
          title={
            isAdmin
              ? 'This alert queue exists to prioritise platform intervention'
              : isVendor
                ? 'This alert queue exists to protect studio flow and payout awareness'
                : 'This alert queue exists to keep bookings and payment steps visible'
          }
          description={
            isAdmin
              ? 'Treat alerts as the front door to disputes, account risk, and finance review. Start here when a signal appears, then move into operations for the actual decision.'
              : isVendor
                ? 'Treat alerts as the signal layer for new delivery, replies, trust movement, or payout-related changes before you jump into deeper studio work.'
                : 'Treat alerts as your cue for escrow, replies, delivery changes, and payment movement before you dive back into the booking itself.'
          }
          highlights={
            isAdmin
              ? [
                  'Unread risk should outrank softer platform updates.',
                  'Alerts point to work; they are not the work itself.',
                  'Move into operations once priority is clear.',
                ]
              : isVendor
                ? [
                    'Use alerts to catch delivery and payout changes early.',
                    'Read the signal, then switch to the studio or inbox.',
                    'Do not leave important updates buried in the feed.',
                  ]
              : [
                  'Use alerts to catch payment and delivery changes quickly.',
                  'Unread items should guide what booking to open next.',
                  'Return to bookings once the next step is clear.',
                ]
          }
          actions={
            <>
              <Button size="sm" onClick={() => document.getElementById('notifications-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                Open alert feed
              </Button>
              <Link href={isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard/client'}>
                <Button size="sm" variant="ghost">Return to workspace</Button>
              </Link>
            </>
          }
        />
      </div>

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '40ms' }}>
        <WorkflowSteps
          eyebrow="Typical alert flow"
          title="The cleanest way to handle notifications"
          steps={[
            { title: 'Check unread items', description: 'See which new signals appeared since the last session.' },
            { title: 'Filter by category', description: 'Separate finance, escrow, message, risk, and general platform alerts.' },
            { title: 'Read for context', description: 'Understand whether the alert is informational or requires a real action.' },
            { title: 'Continue in the right place', description: 'Move to bookings, inbox, services, or operations when action is necessary.' },
          ]}
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '80ms' }}>
        <SectionNavigator
          className="mt-6"
          title="Move through alerts without losing context"
          description="Use these anchors when you want the summary first, the alert feed itself, or the closing guide note."
          items={[
            { href: '#notifications-summary', label: 'Summary', helper: 'See alert totals by lane.' },
            { href: '#notifications-feed', label: 'Feed', helper: 'Filter and act on real alerts.' },
            { href: '#notifications-note', label: 'Guide', helper: 'Keep alert handling disciplined.' },
          ]}
        />
      </div>

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '120ms' }}>
        <PriorityBanner
          title={notificationsPriority.title}
          description={notificationsPriority.description}
          tone={notificationsPriority.tone}
          actions={
            <>
              <Button
                size="sm"
                variant={unreadCount ? 'primary' : 'ghost'}
                onClick={() => {
                  setFilter('unread');
                  document.getElementById('notifications-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Show unread
              </Button>
              <Button
                size="sm"
                variant={riskUnreadCount ? 'primary' : 'ghost'}
                onClick={() => {
                  setFilter('unread');
                  setCategoryFilter('risk');
                  document.getElementById('notifications-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Focus risk
              </Button>
              <Button
                size="sm"
                variant={financeUnreadCount ? 'primary' : 'ghost'}
                onClick={() => {
                  setFilter('unread');
                  setCategoryFilter('finance');
                  document.getElementById('notifications-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Focus finance
              </Button>
              {hasAlertFilters ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFilter('all');
                    setCategoryFilter('all');
                    setNotificationSearch('');
                  }}
                >
                  Reset alert view
                </Button>
              ) : null}
            </>
          }
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card variant="activity">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Unread alerts</p>
          <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{unreadCount}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Signals that still need to be reviewed or cleared.</p>
        </Card>
        <Card variant="finance">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Unread finance</p>
          <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{financeUnreadCount}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Payment and payout alerts still waiting in the queue.</p>
        </Card>
        <Card variant="risk">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Unread risk</p>
          <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{riskUnreadCount}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Risk and trust alerts that still need review.</p>
        </Card>
      </div>

      <div id="notifications-summary" className="grid gap-5 md:grid-cols-4 scroll-mt-24">
        {highlightCards.map(({ category, count }) => {
          const Icon = categoryMeta[category].icon;

          return (
            <Card key={category}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{categoryMeta[category].label}</p>
                  <p className="mt-3 font-display text-4xl text-[var(--text-primary)]">{count}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Alerts in this WOLFIX lane.</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(78,137,255,0.12)] text-[var(--brand-primary)]">
                  <Icon className="size-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card id="notifications-feed" variant="risk" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Alert feed"
          title="User-facing system signals"
          description={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'} across the current user session.`}
          variant="risk"
          actions={
            <>
              <Button variant={filter === 'all' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('all')}>
                All
              </Button>
              <Button variant={filter === 'unread' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('unread')}>
                Unread
              </Button>
            </>
          }
        />

        <div className="mt-5 flex flex-wrap gap-3">
          <div className="w-full space-y-2">
            <label className="text-sm text-[var(--text-secondary)]" htmlFor="notification-search">Search alerts</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                id="notification-search"
                value={notificationSearch}
                onChange={(event) => setNotificationSearch(event.target.value)}
                placeholder="Search alert titles or messages..."
                className="pl-11"
              />
            </div>
          </div>
          {(Object.keys(categoryMeta) as NotificationCategory[]).map((category) => {
            const Icon = categoryMeta[category].icon;
            const count = category === 'all'
              ? notifications.data?.length ?? 0
              : categoryCounts[category];

            return (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs uppercase tracking-[0.16em] transition',
                  categoryFilter === category
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--ink-strong)]'
                    : 'border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                <Icon className="size-3.5" />
                <span>{categoryMeta[category].label}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px]', categoryFilter === category ? 'bg-white/20' : 'bg-[rgba(78,137,255,0.12)] text-[var(--brand-secondary)]')}>
                  {count}
                </span>
              </button>
            );
          })}
          {hasAlertFilters ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setFilter('all');
                setCategoryFilter('all');
                setNotificationSearch('');
              }}
            >
              Reset view
            </Button>
          ) : null}
        </div>

        {feedback ? (
          <div className="mt-5">
            <FeedbackBanner message={feedback} tone="info" onDismiss={() => setFeedback(null)} />
          </div>
        ) : null}

        <div className="mt-5">
          <InlineStateNote
            tone={filter === 'unread' || categoryFilter !== 'all' ? 'success' : 'info'}
            message={currentFeedLabel}
          />
        </div>

        <div className="mt-5 space-y-4">
          {notifications.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : null}
          {notifications.isError ? (
            <FeedbackBanner
              message={notifications.error instanceof Error ? notifications.error.message : 'Unable to load notifications'}
              tone="danger"
            />
          ) : null}
          {visibleNotifications.map((notification, index) => {
            const category = detectNotificationCategory(notification);
            const categoryTone =
              category === 'risk'
                ? 'danger'
                : category === 'finance'
                  ? 'warning'
                  : category === 'message'
                    ? 'info'
                    : category === 'escrow'
                      ? 'success'
                      : 'neutral';

            const shellClass =
              category === 'risk'
                ? 'border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.56),rgba(108,36,74,0.4))]'
                : category === 'finance'
                  ? 'border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.62),rgba(32,47,132,0.42))]'
                  : category === 'message'
                    ? 'border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.62),rgba(15,63,120,0.42))]'
                    : category === 'escrow'
                      ? 'border-[rgba(123,165,255,0.2)] bg-[linear-gradient(180deg,rgba(12,35,91,0.62),rgba(18,64,134,0.42))]'
                      : 'border-[rgba(184,208,255,0.16)] bg-[rgba(255,255,255,0.04)]';

            return (
              <div
                key={notification.id}
                className={cn('rounded-[24px] border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(0,0,0,0.24)] animate-fade-up-delayed', shellClass)}
                style={{ ['--stagger-delay' as string]: `${index * 50}ms` }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{notification.createdAt}</p>
                    <p className="mt-2 font-display text-xl text-[var(--text-primary)]">{notification.title}</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{notification.message}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge label={categoryMeta[category].label} tone={categoryTone} />
                    <StatusBadge label={notification.isRead ? 'read' : 'unread'} tone={notification.isRead ? 'neutral' : 'info'} />
                    {!notification.isRead ? (
                      <Button size="sm" variant="ghost" onClick={() => markRead.mutate(notification.id)} disabled={markRead.isPending}>
                        Mark as read
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {getNotificationActionLinks(category).map((action) => (
                    <Link key={`${notification.id}-${action.href}-${action.label}`} href={action.href}>
                      <Button size="sm" variant="ghost">{action.label}</Button>
                    </Link>
                  ))}
                </div>
                <NextActionHint label={getNotificationActionHint(category)} />
              </div>
            );
          })}
          {!notifications.isLoading && !visibleNotifications.length ? (
            <EmptyState
              icon={<BellRing className="size-5" />}
              title={filter === 'unread' ? 'No unread notifications here' : 'No notifications match this view'}
              description={filter === 'unread'
                ? categoryFilter === 'all'
                  ? 'Every alert currently in the queue has already been reviewed, so you can return to the wider workspace or scan the full feed.'
                  : `All ${categoryMeta[categoryFilter].label.toLowerCase()} alerts in this filtered view are already cleared or read.`
                : 'The current search or category is hiding the feed. Reset the alert view or move into the lane most likely to produce the next real signal.'}
              action={
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFilter('all');
                      setCategoryFilter('all');
                    }}
                  >
                    Reset view
                  </Button>
                  <Link href={categoryFilter === 'risk' ? (isAdmin ? '/dashboard/admin' : '/dashboard') : categoryFilter === 'finance' ? (isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard/client') : isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard/client'}>
                    <Button variant="ghost">
                      Open related workspace
                    </Button>
                  </Link>
                  <Link href={isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard/client'}>
                    <Button variant="ghost">Open workspace</Button>
                  </Link>
                </div>
              }
            />
          ) : null}
        </div>
      </Card>

      <Card id="notifications-note" variant="activity" className="mt-6 scroll-mt-24">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(12,35,91,0.62),rgba(18,64,134,0.42))] text-[var(--brand-secondary)]">
            <BellRing className="size-5" />
          </div>
          <div>
            <p className="font-display text-xl tracking-[-0.03em] text-[var(--text-primary)] drop-shadow-[0_16px_28px_rgba(47,107,255,0.12)]">Operational note</p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              This page is designed to keep new alerts clear and easy to review as more marketplace activity appears over time.
            </p>
          </div>
        </div>
      </Card>
    </DashboardShell>
  );
}
