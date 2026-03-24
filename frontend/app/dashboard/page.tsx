'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Activity, BellRing, MessagesSquare, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';

import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { FirstLoginWelcome } from '@/components/ui/first-login-welcome';
import { FirstSessionState } from '@/components/ui/first-session-state';
import { OnboardingChecklist } from '@/components/ui/onboarding-checklist';
import { PulseMetricsStrip } from '@/components/ui/pulse-metrics-strip';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkflowSteps } from '@/components/ui/workflow-steps';
import { WorkspaceGuide } from '@/components/ui/workspace-guide';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getVerificationTone } from '@/lib/status';

export default function DashboardOverviewPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.roles.includes('ROLE_ADMIN') ?? false;
  const isVendor = user?.roles.includes('ROLE_VENDOR') ?? false;
  const roleKey = isAdmin ? 'admin' : isVendor ? 'vendor' : 'client';

  const backendStatus = useQuery({
    queryKey: ['backend-status'],
    queryFn: () => apiClient.getBackendStatus(),
  });

  const vendorProfile = useQuery({
    queryKey: ['vendor-profile', token],
    queryFn: () => apiClient.getVendorProfile(token ?? ''),
    enabled: Boolean(token) && user?.roles.includes('ROLE_VENDOR'),
  });

  const adminHealth = useQuery({
    queryKey: ['admin-metrics-health', token],
    queryFn: () => apiClient.getAdminMetricsHealth(token ?? ''),
    enabled: Boolean(token) && user?.roles.includes('ROLE_ADMIN'),
  });
  const overviewBookings = useQuery({
    queryKey: ['overview-bookings', token, roleKey],
    queryFn: () => apiClient.getBookings(token ?? ''),
    enabled: Boolean(token) && !isAdmin,
  });
  const overviewServices = useQuery({
    queryKey: ['overview-services', token, user?.id],
    queryFn: () => apiClient.getServices(token),
    enabled: Boolean(token) && isVendor,
  });
  const overviewDisputes = useQuery({
    queryKey: ['overview-disputes', token],
    queryFn: () => apiClient.getDisputedEscrows(token ?? ''),
    enabled: Boolean(token) && isAdmin,
  });
  const overviewRisk = useQuery({
    queryKey: ['overview-risk', token],
    queryFn: () => apiClient.getAdminRiskOverview(token ?? ''),
    enabled: Boolean(token) && isAdmin,
  });
  const overviewAdminUsers = useQuery({
    queryKey: ['overview-admin-users', token],
    queryFn: () => apiClient.getAdminUsers(token ?? ''),
    enabled: Boolean(token) && isAdmin,
  });
  const notifications = useQuery({
    queryKey: ['dashboard-notifications', token],
    queryFn: () => apiClient.getNotifications(token ?? ''),
    enabled: Boolean(token),
  });
  const messages = useQuery({
    queryKey: ['dashboard-messages', token],
    queryFn: () => apiClient.getMessages(token ?? ''),
    enabled: Boolean(token),
  });

  const unreadNotifications = notifications.data?.filter((item) => !item.isRead) ?? [];
  const hasMessages = (messages.data?.length ?? 0) > 0;
  const hasUnreadAlerts = unreadNotifications.length > 0;
  const vendorProfileMissing = isVendor && vendorProfile.data?.exists === false;
  const adminNeedsAttention = isAdmin && adminHealth.data ? !adminHealth.data.is_healthy : false;
  const vendorServiceCount =
    overviewServices.data?.filter((service) => service.vendor_user_id === user?.id).length ?? 0;
  const overviewActionUserCount =
    overviewAdminUsers.data?.filter((account) => !account.roles.includes('ROLE_ADMIN')).length ?? 0;
  const clientFirstSession =
    !isAdmin &&
    !isVendor &&
    !overviewBookings.isLoading &&
    !overviewBookings.isError &&
    (overviewBookings.data?.length ?? 0) === 0;
  const vendorFirstSession =
    isVendor &&
    !vendorProfile.isLoading &&
    !vendorProfile.isError &&
    !overviewServices.isLoading &&
    !overviewServices.isError &&
    !overviewBookings.isLoading &&
    !overviewBookings.isError &&
    !vendorProfile.data?.exists &&
    vendorServiceCount === 0 &&
    (overviewBookings.data?.length ?? 0) === 0;
  const adminFirstSession =
    isAdmin &&
    !overviewDisputes.isLoading &&
    !overviewDisputes.isError &&
    !overviewRisk.isLoading &&
    !overviewRisk.isError &&
    !overviewAdminUsers.isLoading &&
    !overviewAdminUsers.isError &&
    (overviewDisputes.data?.length ?? 0) === 0 &&
    (overviewRisk.data?.latest_fraud_risks.length ?? 0) === 0 &&
    (overviewRisk.data?.vendor_trust_watchlist.length ?? 0) === 0 &&
    overviewActionUserCount === 0;
  const showOverviewFirstSession = clientFirstSession || vendorFirstSession || adminFirstSession;

  const overviewGuide = isAdmin
    ? {
        title: 'Use this page as your operations starting point',
        description: 'This overview is for orientation first. Review platform health here, then move into disputes, watchlists, or user controls only after you know what requires attention.',
        points: [
          'Start with health and unread alerts before touching disputes or user actions.',
          'Use Operations when you need platform-wide decisions such as dispute resolution or account restrictions.',
          'Use Notifications and Inbox when you need context before acting.',
          'If nothing is urgent, move to the area that matches the current business priority.',
        ],
      }
    : isVendor
      ? {
          title: 'Use this page to decide your next delivery task',
          description: 'This overview helps you see whether you should update your business profile, respond to a booking, check alerts, or move into service management.',
          points: [
            'If your business profile is not ready, complete it first so your presence is clear.',
            'If active work exists, open Services to manage listings and delivery progress.',
            'If alerts or messages are waiting, clear them before starting new work.',
            'Use this page as a quick checkpoint, not as your main work surface.',
          ],
        }
      : {
          title: 'Use this page to understand what to do next',
          description: 'This overview tells you whether you should browse services, continue a booking, check a payment state, or reply to a message.',
          points: [
            'Start with Bookings when you already have active work in progress.',
            'Use Services only when you want to browse or select something new.',
            'Use Alerts when you need to know whether action is pending on a booking or payment.',
            'Use Inbox when a booking needs clarification or a delivery follow-up.',
        ],
      };

  const overviewQuickActions = isAdmin
    ? [
        {
          label: 'Review alerts',
          href: '/dashboard/notifications',
          recommended: hasUnreadAlerts,
        },
        {
          label: 'Open operations',
          href: '/dashboard/admin',
          recommended: adminNeedsAttention,
        },
        {
          label: 'Check inbox',
          href: '/dashboard/communications',
          recommended: !hasUnreadAlerts && hasMessages && !adminNeedsAttention,
        },
        {
          label: 'See full command center',
          href: '/dashboard/admin',
          recommended: !hasUnreadAlerts && !hasMessages && !adminNeedsAttention,
        },
      ]
    : isVendor
      ? [
          {
            label: 'Complete profile',
            href: '/dashboard/vendor#vendor-business-setup',
            recommended: vendorProfileMissing,
          },
          {
            label: 'Review alerts',
            href: '/dashboard/notifications',
            recommended: !vendorProfileMissing && hasUnreadAlerts,
          },
          {
            label: 'Open inbox',
            href: '/dashboard/communications',
            recommended: !vendorProfileMissing && !hasUnreadAlerts && hasMessages,
          },
          {
            label: 'Go to service studio',
            href: '/dashboard/vendor',
            recommended: !vendorProfileMissing && !hasUnreadAlerts && !hasMessages,
          },
        ]
      : [
          {
            label: 'Review alerts',
            href: '/dashboard/notifications',
            recommended: hasUnreadAlerts,
          },
          {
            label: 'Open inbox',
            href: '/dashboard/communications',
            recommended: !hasUnreadAlerts && hasMessages,
          },
          {
            label: 'Continue bookings',
            href: '/dashboard/client#client-bookings-rail',
            recommended: !hasUnreadAlerts && !hasMessages,
          },
          {
            label: 'Browse services',
            href: '/dashboard/client#client-service-catalog',
            recommended: false,
          },
        ];

  const recommendedQuickAction =
    overviewQuickActions.find((item) => item.recommended) ?? overviewQuickActions[0];
  const welcomeStorageKey = `wolfix:first-login-welcome:${user?.id ?? 'guest'}:${roleKey}`;

  return (
    <DashboardShell
      title="WOLFIX command center"
      subtitle="Track your marketplace activity, payments, messages, alerts, and workspace progress from one secure WOLFIX surface."
    >
      <FirstLoginWelcome
        storageKey={welcomeStorageKey}
        title={
          isAdmin
            ? 'Use this command center to decide what deserves intervention first'
            : isVendor
              ? 'Use this command center to decide whether today is about setup, delivery, or earnings'
              : 'Use this command center to decide whether you should browse, book, or continue active work'
        }
        description={
          isAdmin
            ? 'Start here after login, confirm the platform pulse, then move into operations only when you know which lane deserves attention.'
            : isVendor
              ? 'Start here after login, confirm whether your studio needs setup, client follow-up, or payout review, then move into the matching workspace.'
              : 'Start here after login, confirm whether new work should begin or existing work already needs action, then move into the right booking lane.'
        }
        highlights={
          isAdmin
            ? [
                'Health and alerts should be read before disputes or account actions.',
                'Watchlists help you prioritise; they should not trigger blind action.',
                'One controlled decision is better than scattered intervention.',
              ]
            : isVendor
              ? [
                  'Profile clarity comes before scale.',
                  'Active delivery beats new listing edits when work is already live.',
                  'Withdrawals come last, after earnings are actually visible.',
                ]
              : [
                  'Browse carefully before opening a booking.',
                  'Protected payment should happen only after escrow exists.',
                  'Messages and reviews make more sense once delivery progress is clear.',
                ]
        }
        actions={
          <Link href={recommendedQuickAction.href}>
            <Button size="sm">{recommendedQuickAction.label}</Button>
          </Link>
        }
      />

      {showOverviewFirstSession ? (
        <FirstSessionState
          title={
            adminFirstSession
              ? 'This command center is ready for the platform’s first escalations'
              : vendorFirstSession
                ? 'Your account is ready for first setup and first delivery'
                : 'Your account is ready for the first protected booking'
          }
          description={
            adminFirstSession
              ? 'The desk is quiet because there are no disputes, watchlist events, or account interventions yet. Learn the lanes now so later decisions feel controlled instead of rushed.'
              : vendorFirstSession
                ? 'No profile, live offer, or engagement is present yet. Build the business identity first, publish one clear service, then return here when real work begins to move.'
                : 'You do not have active work yet. Start by choosing one clear service, create the booking, then return here once alerts, messages, and delivery states begin to appear.'
          }
          steps={
            adminFirstSession
              ? [
                  {
                    label: 'Read the pulse first',
                    detail: 'Use the counters and status cards below to understand how a healthy desk should look before live escalation appears.',
                    href: '/dashboard',
                  },
                  {
                    label: 'Open the operations desk',
                    detail: 'Learn where disputes, watchlists, and user interventions will show up once the marketplace gets busier.',
                    href: '/dashboard/admin',
                  },
                  {
                    label: 'Return here before acting',
                    detail: 'This page should stay the starting point whenever operations pressure begins to rise.',
                    href: '/dashboard',
                  },
                ]
              : vendorFirstSession
                ? [
                    {
                      label: 'Complete the business profile',
                      detail: 'A visible business identity makes the first listing and the first buyer decision much easier.',
                      href: '/dashboard/vendor#vendor-business-setup',
                    },
                    {
                      label: 'Create the first live offer',
                      detail: 'Start with one strong listing before expanding the studio into multiple offers.',
                      href: '/dashboard/vendor#vendor-service-inventory',
                    },
                    {
                      label: 'Return here once activity starts',
                      detail: 'The command center becomes more useful when delivery, inbox, and alerts begin to move.',
                      href: '/dashboard',
                    },
                  ]
                : [
                    {
                      label: 'Browse the service catalog',
                      detail: 'Start from a lane that fits the kind of digital work you actually need.',
                      href: '/dashboard/client#client-service-catalog',
                    },
                    {
                      label: 'Create the first booking',
                      detail: 'Once the booking exists, this command center becomes useful for alerts, follow-up, and progress.',
                      href: '/dashboard/client#client-bookings-rail',
                    },
                    {
                      label: 'Return here to orient yourself',
                      detail: 'Use this page again whenever you need to see what deserves attention next.',
                      href: '/dashboard',
                    },
                  ]
          }
          actions={
            <>
              <Link href={recommendedQuickAction.href}>
                <Button size="sm">{recommendedQuickAction.label}</Button>
              </Link>
              <Link href={isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard/client'}>
                <Button size="sm" variant="ghost">
                  Open main workspace
                </Button>
              </Link>
            </>
          }
        />
      ) : (
        <OnboardingChecklist user={user ?? null} />
      )}

      <WorkspaceGuide
        eyebrow="How to use this page"
        title={overviewGuide.title}
        description={overviewGuide.description}
        points={overviewGuide.points}
        tip="This page is for orientation. Once you know the next task, move into the specific workspace for that action."
      />

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '30ms' }}>
        <PulseMetricsStrip
          title="Read the workspace pulse before opening a lane"
          description="These counters tell you whether attention should go to platform availability, unread alerts, or recent inbox movement before you dive into a detailed workspace."
          items={[
            {
              label: 'Platform status',
              value: backendStatus.data?.status?.toUpperCase() ?? '...',
              detail: backendStatus.data?.message ?? 'Checking platform availability right now.',
              icon: <Activity className="size-5" />,
              variant: 'activity',
            },
            {
              label: 'Unread alerts',
              value: String(unreadNotifications.length),
              detail: unreadNotifications.length
                ? 'There are unread alerts waiting for review before the next decision.'
                : 'No unread alerts are waiting right now.',
              icon: <BellRing className="size-5" />,
              variant: 'risk',
            },
            {
              label: 'Inbox items',
              value: String(messages.data?.length ?? 0),
              detail: messages.data?.length
                ? 'Recent conversation activity is available if a booking or delivery needs context.'
                : 'No inbox activity is currently competing for attention.',
              icon: <MessagesSquare className="size-5" />,
              variant: 'communication',
            },
          ]}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard eyebrow="Workspace status" value={backendStatus.data?.status?.toUpperCase() ?? '...'} detail={backendStatus.data?.message ?? 'Checking service availability.'} icon={<Activity className="size-8" />} variant="activity" />
        <StatCard eyebrow="Business profile" value={vendorProfile.data?.exists ? 'Ready' : 'Pending'} detail={vendorProfile.data?.exists ? vendorProfile.data.company_name ?? 'Business profile detected.' : 'No business profile has been completed for this account yet.'} icon={<WalletCards className="size-8" />} variant="market" />
        <StatCard eyebrow="System health" value={adminHealth.data?.is_healthy ? 'Healthy' : adminHealth.data?.status ?? 'Restricted'} detail={adminHealth.data ? adminHealth.data.message : 'Additional operational metrics appear when this access level is available.'} icon={<ShieldCheck className="size-8" />} variant="guidance" />
      </div>

      <div className="mt-6">
        <WorkflowSteps
          eyebrow="Typical flow"
          title="Most users follow this path"
          steps={[
            { title: 'Check status', description: 'Confirm whether alerts, profile readiness, or urgent activity needs attention first.' },
            { title: 'Open the right lane', description: 'Move into Bookings, Services, Operations, Inbox, or Alerts based on the current task.' },
            { title: 'Take one action', description: 'Finish the immediate action before jumping between multiple areas.' },
            { title: 'Return for orientation', description: 'Come back here when you need a fresh view of the wider workspace.' },
          ]}
        />
      </div>

      <Card variant="guidance" className="mt-6">
        <SectionHeader
          eyebrow="Quick start"
          title="Move directly to the next task"
          description={`Recommended right now: ${recommendedQuickAction.label}. Use these shortcuts to move into the right lane without scanning the full dashboard first.`}
          variant="guidance"
        />
        <div className="mt-5 flex flex-wrap gap-3">
          {overviewQuickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button variant={action.recommended ? 'primary' : 'ghost'} size="sm">
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/client" className="rounded-[24px] border border-[rgba(128,171,255,0.22)] bg-[linear-gradient(180deg,rgba(12,35,91,0.72),rgba(18,64,134,0.54))] p-5 transition duration-300 hover:-translate-y-1 hover:bg-[linear-gradient(180deg,rgba(16,43,109,0.82),rgba(22,77,158,0.62))] hover:shadow-[0_24px_54px_rgba(0,0,0,0.24)] animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '0ms' }}>
            <p className="font-display text-xl text-[var(--text-primary)]">Bookings</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Open live delivery work, escrow progress, and booking actions.</p>
          </Link>
          <Link href="/dashboard/vendor" className="rounded-[24px] border border-[rgba(170,180,255,0.22)] bg-[linear-gradient(180deg,rgba(18,27,90,0.72),rgba(37,48,132,0.54))] p-5 transition duration-300 hover:-translate-y-1 hover:bg-[linear-gradient(180deg,rgba(22,34,104,0.82),rgba(49,62,154,0.62))] hover:shadow-[0_24px_54px_rgba(0,0,0,0.24)] animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '55ms' }}>
            <p className="font-display text-xl text-[var(--text-primary)]">Services</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Update listings, business profile, and payout readiness.</p>
          </Link>
          <Link href="/dashboard/notifications" className="rounded-[24px] border border-[rgba(255,151,182,0.22)] bg-[linear-gradient(180deg,rgba(58,18,48,0.68),rgba(108,36,74,0.5))] p-5 transition duration-300 hover:-translate-y-1 hover:bg-[linear-gradient(180deg,rgba(68,22,56,0.78),rgba(124,44,84,0.58))] hover:shadow-[0_24px_54px_rgba(0,0,0,0.24)] animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '110ms' }}>
            <p className="font-display text-xl text-[var(--text-primary)]">Alerts</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Review notifications, follow-ups, and account signals faster.</p>
          </Link>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card variant="market">
          <SectionHeader
            eyebrow="Workspace routing"
            title="Understand where each task lives"
            description="The system is organised into a few clear lanes so each action has an obvious home."
            variant="market"
          />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Bookings',
                copy: 'Track service bookings, project progress, payment milestones, and communication in one place.',
              },
              {
                title: 'Services',
                copy: 'Manage service listings, business details, reviews, and delivery readiness from one workspace.',
              },
              {
                title: 'Operations',
                copy: 'Review alerts, disputes, marketplace health, and activity across the wider platform.',
              },
            ].map((panel, index) => (
                <div key={panel.title} className="rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(0,0,0,0.2)] animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: `${index * 50}ms` }}>
                  <p className="font-display text-xl text-[var(--text-primary)]">{panel.title}</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{panel.copy}</p>
                </div>
              ))}
          </div>
        </Card>

        <Card variant="activity">
          <SectionHeader
            eyebrow="Current session"
            title="Session clarity"
            description="See the account state that affects what the workspace can show right now."
            variant="activity"
          />
          <div className="mt-5 space-y-4 text-sm text-[var(--text-secondary)]">
            <div className="rounded-[22px] border border-[rgba(123,165,255,0.2)] bg-[linear-gradient(180deg,rgba(12,35,91,0.62),rgba(18,64,134,0.42))] p-4 transition duration-300 hover:-translate-y-1">
              <span className="block text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">User</span>
              <span className="mt-2 block text-base text-[var(--text-primary)]">{user?.email ?? 'Not signed in'}</span>
            </div>
            <div className="rounded-[22px] border border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.62),rgba(15,63,120,0.42))] p-4 transition duration-300 hover:-translate-y-1">
              <span className="block text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Access</span>
              <div className="mt-2">
                <StatusBadge label={user ? 'authorised' : 'guest'} tone={user ? 'info' : 'warning'} />
              </div>
            </div>
            <div className="rounded-[22px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.62),rgba(32,47,132,0.42))] p-4 transition duration-300 hover:-translate-y-1">
              <span className="block text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Verification</span>
              <div className="mt-2">
                <StatusBadge label={user?.is_verified ? 'verified' : 'unverified'} tone={getVerificationTone(Boolean(user?.is_verified))} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card variant="communication">
          <SectionHeader
            eyebrow="Communications rail"
            title="Inbox pulse"
            description="Recent conversation activity appears here so follow-ups are easy to spot."
            variant="communication"
            actions={
              <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                {messages.data?.length ?? 0} threads touched
              </div>
            }
          />

          <div className="mt-5 space-y-4">
            {messages.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : null}
            {messages.isError ? (
              <FeedbackBanner message={messages.error instanceof Error ? messages.error.message : 'Unable to load inbox'} tone="danger" />
            ) : null}
            {messages.data?.slice(0, 3).map((message, index) => (
              <div key={message.id} className="rounded-[22px] border border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.62),rgba(15,63,120,0.42))] p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(0,0,0,0.2)] animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: `${index * 50}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      {message.senderEmail} → {message.receiverEmail}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-primary)]">{message.content}</p>
                  </div>
                  <MessagesSquare className="mt-1 size-5 text-[var(--brand-secondary)]" />
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{message.createdAt}</p>
              </div>
            ))}
            {!messages.isLoading && !messages.data?.length ? (
              <EmptyState
                icon={<MessagesSquare className="size-5" />}
                title="No messages yet"
                description="The inbox stays quiet until booking conversations or account communication begins."
                action={<Link href="/dashboard/communications"><Button variant="ghost">Open inbox</Button></Link>}
              />
            ) : null}
          </div>

          <Link href="/dashboard/communications" className="mt-5 inline-flex">
            <Button variant="ghost">Open inbox</Button>
          </Link>
        </Card>

        <Card variant="risk">
          <SectionHeader
            eyebrow="Notification rail"
            title="Readiness and alerts"
            description="Stay ahead of new activity without opening the full notification center first."
            variant="risk"
            actions={
              <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                {unreadNotifications.length} unread
              </div>
            }
          />

          <div className="mt-5 space-y-4">
            {notifications.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : null}
            {notifications.isError ? (
              <FeedbackBanner message={notifications.error instanceof Error ? notifications.error.message : 'Unable to load notifications'} tone="danger" />
            ) : null}
            {notifications.data?.slice(0, 3).map((notification, index) => (
              <div key={notification.id} className="rounded-[22px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.56),rgba(108,36,74,0.4))] p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(0,0,0,0.2)] animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: `${index * 50}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base text-[var(--text-primary)]">{notification.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{notification.message}</p>
                  </div>
                  <BellRing className={`mt-1 size-5 ${notification.isRead ? 'text-[var(--text-tertiary)]' : 'text-[var(--brand-secondary)]'}`} />
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{notification.createdAt}</p>
              </div>
            ))}
            {!notifications.isLoading && !notifications.data?.length ? (
              <EmptyState
                icon={<Sparkles className="size-5" />}
                title="No notifications yet"
                description="Alerts will start to appear here as bookings, payments, and communication become active."
                action={<Link href="/dashboard/notifications"><Button variant="ghost">Open notifications</Button></Link>}
              />
            ) : null}
          </div>

          <Link href="/dashboard/notifications" className="mt-5 inline-flex">
            <Button variant="ghost">Open notifications</Button>
          </Link>
        </Card>
      </div>
    </DashboardShell>
  );
}
