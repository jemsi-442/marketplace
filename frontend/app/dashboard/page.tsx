'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Activity, BellRing, MessagesSquare, ShieldCheck, WalletCards } from 'lucide-react';

import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

export default function DashboardOverviewPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

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

  return (
    <DashboardShell
      title="Marketplace command center"
      subtitle="This shell is already connected to the live Symfony backend health contract, and it is ready to expand into escrow, payouts, disputes, and trust operations."
    >
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard eyebrow="Backend status" value={backendStatus.data?.status?.toUpperCase() ?? '...'} detail={backendStatus.data?.message ?? 'Checking root API heartbeat.'} icon={<Activity className="size-8" />} />
        <StatCard eyebrow="Vendor posture" value={vendorProfile.data?.exists ? 'Ready' : 'Pending'} detail={vendorProfile.data?.exists ? vendorProfile.data.company_name ?? 'Vendor profile detected.' : 'No vendor profile detected for this account yet.'} icon={<WalletCards className="size-8" />} />
        <StatCard eyebrow="Admin health" value={adminHealth.data?.is_healthy ? 'Healthy' : adminHealth.data?.status ?? 'Restricted'} detail={adminHealth.data ? adminHealth.data.message : 'Admin metrics become available when an admin signs in.'} icon={<ShieldCheck className="size-8" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Role routing</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Client cockpit',
                copy: 'Track bookings, escrow state, milestones, and delivery confidence.',
              },
              {
                title: 'Vendor cockpit',
                copy: 'Manage profile strength, wallet balance, payouts, and trust indicators.',
              },
              {
                title: 'Admin cockpit',
                copy: 'Oversee platform health, disputes, risk telemetry, and revenue posture.',
              },
            ].map((panel) => (
              <div key={panel.title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                <p className="font-display text-xl text-[var(--text-primary)]">{panel.title}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{panel.copy}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Current session</p>
          <div className="mt-5 space-y-4 text-sm text-[var(--text-secondary)]">
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <span className="block text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">User</span>
              <span className="mt-2 block text-base text-[var(--text-primary)]">{user?.email ?? 'Not signed in'}</span>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <span className="block text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Roles</span>
              <span className="mt-2 block text-base text-[var(--text-primary)]">{user?.roles.join(', ') ?? 'Guest'}</span>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <span className="block text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Verification</span>
              <span className="mt-2 block text-base text-[var(--text-primary)]">{user?.is_verified ? 'Verified' : 'Unverified'}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Communications rail</p>
              <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Inbox pulse</h2>
            </div>
            <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {messages.data?.length ?? 0} threads touched
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {messages.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading inbox pulse...</p> : null}
            {messages.isError ? <p className="text-sm text-rose-300">{messages.error instanceof Error ? messages.error.message : 'Unable to load inbox'}</p> : null}
            {messages.data?.slice(0, 3).map((message) => (
              <div key={message.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
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
              <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-sm text-[var(--text-secondary)]">
                No messages yet. The inbox page is ready once marketplace conversations begin.
              </div>
            ) : null}
          </div>

          <Link href="/dashboard/communications" className="mt-5 inline-flex">
            <Button variant="ghost">Open inbox</Button>
          </Link>
        </Card>

        <Card>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Notification rail</p>
              <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Readiness and alerts</h2>
            </div>
            <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {unreadNotifications.length} unread
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {notifications.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading notifications...</p> : null}
            {notifications.isError ? <p className="text-sm text-rose-300">{notifications.error instanceof Error ? notifications.error.message : 'Unable to load notifications'}</p> : null}
            {notifications.data?.slice(0, 3).map((notification) => (
              <div key={notification.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
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
              <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-sm text-[var(--text-secondary)]">
                No notifications yet. Operational alerts will surface here as backend events start firing.
              </div>
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
