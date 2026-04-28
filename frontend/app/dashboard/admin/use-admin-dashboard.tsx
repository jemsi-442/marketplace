'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BriefcaseBusiness,
  ClipboardList,
  MessagesSquare,
  ShieldAlert,
  ShieldCheck,
  Users,
  Waypoints,
} from 'lucide-react';
import { useState } from 'react';

import type { DashboardActionLinkItem } from '@/components/dashboard/dashboard-action-links';
import type { HeroSignalItem } from '@/components/dashboard/dashboard-hero-signal-panel';
import type { ActionSummaryItem } from '@/components/ui/action-summary-strip';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

const HOME_SUMMARY_STALE_MS = 60_000;

export function useAdminDashboard() {
  const token = useAuthStore((state) => state.token);
  const [days, setDays] = useState(30);

  const summary = useQuery({
    queryKey: ['admin-dashboard-summary', token],
    queryFn: () => apiClient.getAdminDashboardSummary(token ?? ''),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
  });

  const metricsHealth = useQuery({
    queryKey: ['admin-metrics-health', token],
    queryFn: () => apiClient.getAdminMetricsHealth(token ?? ''),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const metricsTrend = useQuery({
    queryKey: ['admin-metrics-trend', token, days],
    queryFn: () => apiClient.getAdminMetricsTrend(token ?? '', days),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const opsOverview = useQuery({
    queryKey: ['admin-ops-overview', token],
    queryFn: () => apiClient.getAdminOpsOverview(token ?? ''),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const riskOverview = useQuery({
    queryKey: ['admin-risk-overview', token],
    queryFn: () => apiClient.getAdminRiskOverview(token ?? ''),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const data = summary.data ?? {
    open_requests: 0,
    pending_capabilities: 0,
    active_bookings: 0,
    disputes: 0,
  };

  const isLoading = summary.isLoading;
  const openDisputes = data.disputes;
  const criticalUsers = riskOverview.data?.summary.critical_users ?? 0;
  const trustWatchlist = riskOverview.data?.vendor_trust_watchlist.length ?? 0;
  const deskPressure = Math.min((data.open_requests + data.pending_capabilities + openDisputes) * 12, 100);

  const quickActions: DashboardActionLinkItem[] = [
    { href: '/dashboard/admin-requests', label: 'Open requests', icon: <ClipboardList className="size-4" /> },
    { href: '/dashboard/admin-verifications', label: 'Vendor verification', icon: <ShieldCheck className="size-4" />, variant: 'ghost' },
    { href: '/dashboard/admin-users', label: 'Open users', icon: <Users className="size-4" />, variant: 'ghost' },
  ];

  const summaryItems: ActionSummaryItem[] = [
    {
      eyebrow: 'Request review',
      value: String(data.open_requests),
      detail:
        data.open_requests > 0
          ? 'New client work is waiting for review.'
          : 'The request review queue is currently calm.',
      icon: <ClipboardList className="size-4" />,
      tone: 'activity',
    },
    {
      eyebrow: 'Vendor readiness',
      value: String(data.pending_capabilities),
      detail:
        data.pending_capabilities > 0
          ? 'Vendor lanes are waiting for approval.'
          : 'Capability approvals are caught up for now.',
      icon: <Activity className="size-4" />,
      tone: 'guidance',
    },
    {
      eyebrow: 'Dispute pressure',
      value: String(openDisputes),
      detail:
        openDisputes > 0
          ? 'Escrow cases still need admin judgement.'
          : 'No disputed escrows are waiting right now.',
      icon: <ShieldCheck className="size-4" />,
      tone: 'finance',
    },
  ];

  const pressureItems: HeroSignalItem[] = [
    {
      label: 'Immediate queue pressure',
      value: deskPressure,
      tone: 'var(--accent-coral)',
      helper: `${data.open_requests + data.pending_capabilities + openDisputes} queue items are active across the desk.`,
    },
    {
      label: 'Critical account pressure',
      value: Math.min(criticalUsers * 20, 100),
      tone: 'var(--accent-amber)',
      helper: `${criticalUsers} critical accounts are waiting for closer review.`,
    },
    {
      label: 'Trust watch pressure',
      value: Math.min(trustWatchlist * 16, 100),
      tone: 'var(--accent-cyan)',
      helper: `${trustWatchlist} businesses are currently inside the trust watchlist.`,
    },
  ];

  const heroActions: DashboardActionLinkItem[] = [
    { href: '/dashboard/admin-requests', label: 'Open requests', icon: <ClipboardList className="size-4" /> },
    { href: '/dashboard/admin-verifications', label: 'Open verification', icon: <ShieldCheck className="size-4" />, variant: 'ghost' },
    { href: '/dashboard/admin-escrows', label: 'Open disputes', icon: <ShieldCheck className="size-4" />, variant: 'ghost' },
  ];

  const operationsStats = [
    {
      eyebrow: 'Open requests',
      value: String(data.open_requests),
      detail: 'Client requests still waiting for review and assignment.',
      icon: <ClipboardList className="size-5" />,
      variant: 'market' as const,
    },
    {
      eyebrow: 'Pending lanes',
      value: String(data.pending_capabilities),
      detail: 'Vendor capability lanes waiting for approval.',
      icon: <Activity className="size-5" />,
      variant: 'activity' as const,
    },
    {
      eyebrow: 'Active bookings',
      value: String(data.active_bookings),
      detail: 'Live work currently under platform oversight.',
      icon: <BriefcaseBusiness className="size-5" />,
      variant: 'communication' as const,
    },
    {
      eyebrow: 'Disputes',
      value: String(data.disputes),
      detail: 'Escrow cases open and waiting for a decision.',
      icon: <ShieldAlert className="size-5" />,
      variant: 'risk' as const,
    },
  ];

  const workingLanes = [
    {
      eyebrow: 'Lane 1',
      title: 'Review incoming requests',
      description: 'Compare vendor proposals, choose the best fit, and keep the request desk moving with clean decisions.',
      icon: <ClipboardList className="size-5" />,
      accent: 'var(--accent-cyan)',
      tags: ['Requests', 'Triage'],
      actions: [
        { href: '/dashboard/admin-requests', label: 'Open request review', icon: <ClipboardList className="size-4" /> },
      ],
    },
    {
      eyebrow: 'Lane 2',
      title: 'Monitor active bookings',
      description: 'Use the booking lane when payment, delivery, or final review needs direct admin attention.',
      icon: <BriefcaseBusiness className="size-5" />,
      accent: 'var(--accent-teal)',
      tags: ['Bookings', 'Oversight'],
      actions: [
        { href: '/dashboard', label: 'Open bookings', icon: <BriefcaseBusiness className="size-4" />, variant: 'ghost' as const },
      ],
    },
    {
      eyebrow: 'Lane 3',
      title: 'Review vendor lanes',
      description: 'Approve vendor capability lanes before those lanes can start receiving matched requests.',
      icon: <Activity className="size-5" />,
      accent: 'var(--accent-amber)',
      tags: ['Capabilities', 'Approval'],
      actions: [
        { href: '/dashboard/admin-capabilities', label: 'Open capability lanes', icon: <Activity className="size-4" />, variant: 'ghost' as const },
      ],
    },
    {
      eyebrow: 'Lane 4',
      title: 'Handle users, disputes, and coordination',
      description: 'Manage accounts, review disputed escrows, and open inbox when platform-managed coordination needs attention.',
      icon: <Users className="size-5" />,
      accent: 'var(--accent-violet)',
      tags: ['Users', 'Intervention'],
      actions: [
        { href: '/dashboard/admin-users', label: 'Open users', icon: <Users className="size-4" />, variant: 'ghost' as const },
        { href: '/dashboard/admin-escrows', label: 'Open disputes', icon: <ShieldCheck className="size-4" />, variant: 'ghost' as const },
        { href: '/dashboard/communications', label: 'Open inbox', icon: <MessagesSquare className="size-4" />, variant: 'ghost' as const },
        { href: '/dashboard/notifications', label: 'Open alerts', icon: <ShieldAlert className="size-4" />, variant: 'ghost' as const },
      ],
    },
  ];

  return {
    days,
    setDays,
    isLoading,
    data,
    criticalUsers,
    trustWatchlist,
    summary,
    metricsHealth,
    metricsTrend,
    opsOverview,
    riskOverview,
    quickActions,
    summaryItems,
    pressureItems,
    heroActions,
    operationsStats,
    workingLanes,
  };
}

export type AdminDashboardModel = ReturnType<typeof useAdminDashboard>;
