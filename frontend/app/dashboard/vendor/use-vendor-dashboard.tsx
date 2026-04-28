'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BriefcaseBusiness,
  ClipboardList,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Waypoints,
} from 'lucide-react';

import type { DashboardActionLinkItem } from '@/components/dashboard/dashboard-action-links';
import { formatDashboardMoney, formatDashboardPercent } from '@/components/dashboard/dashboard-formatters';
import type { HeroSignalItem } from '@/components/dashboard/dashboard-hero-signal-panel';
import type { ActionSummaryItem } from '@/components/ui/action-summary-strip';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

const HOME_SUMMARY_STALE_MS = 60_000;

export function useVendorDashboard() {
  const token = useAuthStore((state) => state.token);

  const vendorSummary = useQuery({
    queryKey: ['vendor-dashboard-summary', token],
    queryFn: () => apiClient.getVendorDashboardSummary(token ?? ''),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
  });
  const vendorBookings = useQuery({
    queryKey: ['vendor-dashboard-bookings-preview', token],
    queryFn: () => apiClient.getBookings(token ?? '', { limit: 6, view: 'all' }),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
  });

  const summary = vendorSummary.data ?? {
    active_capabilities: 0,
    approved_capabilities: 0,
    pending_capabilities: 0,
    returned_capabilities: 0,
    open_requests: 0,
    active_bookings: 0,
    protected_bookings: 0,
    available_balance_minor: 0,
    currency: 'TZS',
    verification_status: 'not_started',
    verification_badge_granted: false,
    resume_uploaded: false,
    interview_score: null,
  };

  const isLoading = vendorSummary.isLoading;
  const requestActionHref = summary.verification_badge_granted ? '/dashboard/vendor-requests' : '/dashboard/vendor-verification';
  const requestActionLabel = summary.verification_badge_granted ? 'Requests' : 'Verification';
  const studioCoverage = summary.active_capabilities ? (summary.approved_capabilities / summary.active_capabilities) * 100 : 0;
  const deliveryProtection = summary.active_bookings ? (summary.protected_bookings / summary.active_bookings) * 100 : 0;
  const demandPressure = Math.min((summary.open_requests + summary.active_bookings) * 18, 100);
  const analyticsBookings = vendorBookings.data?.items ?? [];
  const totalStudioLanes = summary.approved_capabilities + summary.pending_capabilities + summary.returned_capabilities;
  const activeStudioLanes = summary.approved_capabilities + summary.pending_capabilities;

  const quickActions: DashboardActionLinkItem[] = [
    { href: '/dashboard/vendor-capabilities', label: 'Capability lanes', icon: <Sparkles className="size-4" /> },
    { href: '/dashboard/vendor-verification', label: 'Verification', icon: <ShieldCheck className="size-4" />, variant: 'ghost' },
    { href: requestActionHref, label: requestActionLabel, icon: <ClipboardList className="size-4" />, variant: 'ghost' },
  ];

  const summaryItems: ActionSummaryItem[] = [
    {
      eyebrow: 'Review coverage',
      value: formatDashboardPercent(studioCoverage),
      detail:
        summary.pending_capabilities > 0
          ? `${summary.pending_capabilities} lane${summary.pending_capabilities === 1 ? '' : 's'} still waiting for review.`
          : 'Approved lanes are already carrying the studio.',
      icon: <ShieldCheck className="size-4" />,
      tone: 'guidance',
    },
    {
      eyebrow: 'Demand pressure',
      value: String(summary.open_requests),
      detail:
        !summary.verification_badge_granted
          ? 'Matched requests stay locked until vendor verification is complete.'
          : summary.open_requests > 0
            ? 'Matched requests are open now. Review them soon.'
            : 'No new matched requests are waiting right now.',
      icon: <ClipboardList className="size-4" />,
      tone: 'activity',
    },
    {
      eyebrow: 'Wallet ready',
      value: formatDashboardMoney(summary.available_balance_minor, summary.currency),
      detail:
        summary.available_balance_minor > 0
          ? 'Confirmed vendor balance is ready for withdrawal.'
          : 'Payout balance will appear here after protected work clears.',
      icon: <WalletCards className="size-4" />,
      tone: 'finance',
    },
    {
      eyebrow: 'Verification',
      value: summary.verification_badge_granted ? 'Blue tick active' : summary.resume_uploaded ? 'Interview next' : 'Resume needed',
      detail:
        summary.verification_badge_granted
          ? 'This studio already passed the practical vendor interview.'
          : summary.resume_uploaded
            ? 'Resume is ready. Finish the interview.'
            : 'Upload the resume and complete the interview.',
      icon: <ShieldCheck className="size-4" />,
      tone: 'guidance',
    },
  ];

  const pressureItems: HeroSignalItem[] = [
    {
      label: 'Approved capability coverage',
      value: studioCoverage,
      tone: 'var(--accent-teal)',
      helper: `${summary.approved_capabilities} approved lanes are carrying the studio.`,
    },
    {
      label: 'Protected delivery coverage',
      value: deliveryProtection,
      tone: 'var(--accent-cyan)',
      helper: `${summary.protected_bookings} protected bookings are currently in flow.`,
    },
    {
      label: 'Current workload pressure',
      value: demandPressure,
      tone: 'var(--accent-amber)',
      helper: `${summary.open_requests + summary.active_bookings} live opportunities and bookings are active.`,
    },
  ];

  const heroActions: DashboardActionLinkItem[] = [
    { href: '/dashboard/vendor-capabilities', label: 'Open capability lanes', icon: <Sparkles className="size-4" /> },
    { href: '/dashboard/vendor-verification', label: 'Open verification', icon: <ShieldCheck className="size-4" />, variant: 'ghost' },
    { href: '/dashboard/vendor-withdrawals', label: 'Open withdrawals', icon: <WalletCards className="size-4" />, variant: 'ghost' },
  ];

  const studioStats = [
    {
      eyebrow: 'Approved lanes',
      value: String(summary.approved_capabilities),
      detail: 'Lanes already cleared for matching requests.',
      icon: <ShieldCheck className="size-5" />,
      variant: 'activity' as const,
    },
    {
      eyebrow: 'Open requests',
      value: String(summary.open_requests),
      detail: 'Matched request opportunities visible now.',
      icon: <ClipboardList className="size-5" />,
      variant: 'market' as const,
    },
    {
      eyebrow: 'Active bookings',
      value: String(summary.active_bookings),
      detail: 'Assignments already in motion.',
      icon: <BriefcaseBusiness className="size-5" />,
      variant: 'communication' as const,
    },
    {
      eyebrow: 'Available balance',
      value: formatDashboardMoney(summary.available_balance_minor, summary.currency),
      detail: 'Vendor funds ready for withdrawal.',
      icon: <WalletCards className="size-5" />,
      variant: 'finance' as const,
    },
  ];

  const workingLanes = [
    {
      eyebrow: 'Lane 1',
      title: 'Shape your capability mix',
      description: 'Keep capability lanes active, polished, and admin-approved so matching demand can keep reaching you.',
      icon: <Sparkles className="size-5" />,
      accent: 'var(--brand-primary)',
      tags: ['Capabilities', 'Approval'],
      actions: [
        { href: '/dashboard/vendor-capabilities', label: 'Open capability lanes', icon: <Sparkles className="size-4" /> },
      ],
    },
    {
      eyebrow: 'Lane 2',
      title: summary.verification_badge_granted ? 'Review live request demand' : 'Finish verification first',
      description: summary.verification_badge_granted
        ? 'Open matched requests, send clean proposals, and keep your studio visible where new work is waiting.'
        : 'Before matched requests open, upload your resume, finish the practical interview, and let the blue tick confirm this studio is ready.',
      icon: <ShieldCheck className="size-5" />,
      accent: 'var(--accent-amber)',
      tags: summary.verification_badge_granted ? ['Requests', 'Demand'] : ['Verification', 'Blue tick'],
      actions: [
        {
          href: summary.verification_badge_granted ? '/dashboard/vendor-requests' : '/dashboard/vendor-verification',
          label: summary.verification_badge_granted ? 'Open requests' : 'Open verification',
          icon: summary.verification_badge_granted ? <ClipboardList className="size-4" /> : <ShieldCheck className="size-4" />,
          variant: 'ghost' as const,
        },
      ],
    },
    {
      eyebrow: 'Lane 3',
      title: 'Keep delivery conversations moving',
      description: 'Use bookings and inbox only for work already assigned, protected, and actively moving toward delivery.',
      icon: <MessagesSquare className="size-5" />,
      accent: 'var(--accent-cyan)',
      tags: ['Delivery', 'Inbox'],
      actions: [
        { href: '/dashboard', label: 'Open bookings', icon: <BriefcaseBusiness className="size-4" />, variant: 'ghost' as const },
        { href: '/dashboard/communications', label: 'Open inbox', icon: <MessagesSquare className="size-4" />, variant: 'ghost' as const },
      ],
    },
    {
      eyebrow: 'Lane 4',
      title: 'Move confirmed balance out',
      description: 'Request payout only after protected work clears and the studio wallet is ready to move into mobile money.',
      icon: <WalletCards className="size-5" />,
      accent: 'var(--accent-teal)',
      tags: ['Wallet', 'Withdrawals'],
      actions: [
        { href: '/dashboard/vendor-withdrawals', label: 'Open withdrawals', icon: <WalletCards className="size-4" />, variant: 'ghost' as const },
      ],
    },
  ];

  return {
    summary,
    analyticsBookings,
    totalStudioLanes,
    activeStudioLanes,
    isLoading,
    quickActions,
    summaryItems,
    pressureItems,
    heroActions,
    studioStats,
    workingLanes,
  };
}

export type VendorDashboardModel = ReturnType<typeof useVendorDashboard>;
