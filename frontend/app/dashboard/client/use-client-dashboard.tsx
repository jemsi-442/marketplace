'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Compass, ShieldCheck, WalletCards, Waypoints } from 'lucide-react';

import type { DashboardActionLinkItem } from '@/components/dashboard/dashboard-action-links';
import { formatDashboardMoney } from '@/components/dashboard/dashboard-formatters';
import type { HeroSignalItem } from '@/components/dashboard/dashboard-hero-signal-panel';
import { Button } from '@/components/ui/button';
import type { ActionSummaryItem } from '@/components/ui/action-summary-strip';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

const HOME_SUMMARY_STALE_MS = 60_000;

const popularCategories = [
  'Website Development',
  'Mobile App Development',
  'Social Media Management',
  'Bulk SMS & Messaging Solutions',
  'Government Consultancy Services',
] as const;

export function useClientDashboard() {
  const token = useAuthStore((state) => state.token);

  const summary = useQuery({
    queryKey: ['client-dashboard-summary', token],
    queryFn: () => apiClient.getClientDashboardSummary(token ?? ''),
    enabled: Boolean(token),
    staleTime: HOME_SUMMARY_STALE_MS,
    refetchOnMount: false,
  });

  const data = summary.data ?? {
    visible_lane_count: 0,
    active_requests: 0,
    awaiting_payment_requests: 0,
    tracked_bookings: 0,
    active_bookings: 0,
    protected_bookings: 0,
    disputed_bookings: 0,
    protected_value_minor: 0,
    currency: 'TZS',
    recent_bookings: [],
  };

  const isLoading = summary.isLoading;
  const requestMomentum = Math.min((data.active_requests + data.awaiting_payment_requests) * 18, 100);
  const bookingProtection = data.tracked_bookings ? (data.protected_bookings / data.tracked_bookings) * 100 : 0;
  const disputePressure = Math.min(data.disputed_bookings * 28, 100);

  const quickActions: DashboardActionLinkItem[] = [
    { href: '/dashboard/request-services', label: 'Open lanes', icon: <ArrowRight className="size-4" /> },
    { href: '/dashboard/requests', label: 'Open requests', icon: <ClipboardList className="size-4" />, variant: 'ghost' },
  ];

  const summaryItems: ActionSummaryItem[] = [
    {
      eyebrow: 'Discovery',
      value: String(data.visible_lane_count),
      detail:
        data.visible_lane_count > 0
          ? 'Active request lanes are visible and ready.'
          : 'The request lanes will appear here as soon as active lanes are available.',
      icon: <Compass className="size-4" />,
      tone: 'guidance',
    },
    {
      eyebrow: 'Requests in motion',
      value: String(data.active_requests),
      detail:
        data.active_requests > 0
          ? 'Your request lane has active work waiting for the next step.'
          : 'No active requests are waiting right now.',
      icon: <ClipboardList className="size-4" />,
      tone: 'activity',
    },
    {
      eyebrow: 'Protected value',
      value: formatDashboardMoney(data.protected_value_minor, data.currency),
      detail:
        data.protected_value_minor > 0
          ? 'Recent protected work already has value attached.'
          : 'Protected booking value will appear here once payment is in motion.',
      icon: <WalletCards className="size-4" />,
      tone: 'finance',
    },
  ];

  const pressureItems: HeroSignalItem[] = [
    {
      label: 'Request momentum',
      value: requestMomentum,
      tone: 'var(--accent-cyan)',
      helper: `${data.active_requests + data.awaiting_payment_requests} request steps are currently active.`,
    },
    {
      label: 'Booking protection',
      value: bookingProtection,
      tone: 'var(--accent-teal)',
      helper: `${data.protected_bookings} protected bookings are visible in the desk.`,
    },
    {
      label: 'Dispute pressure',
      value: disputePressure,
      tone: 'var(--accent-coral)',
      helper: `${data.disputed_bookings} disputes are competing for attention.`,
    },
  ];

  const heroActions: DashboardActionLinkItem[] = [
    { href: '/dashboard/request-services', label: 'Explore business lanes', icon: <ArrowRight className="size-4" /> },
    { href: '/dashboard', label: 'Open bookings', icon: <ShieldCheck className="size-4" />, variant: 'ghost' },
  ];

  const workspaceStats = [
    {
      eyebrow: 'Business lanes',
      value: String(data.visible_lane_count),
      detail: 'Active business lanes visible for new requests.',
      icon: <Compass className="size-5" />,
      variant: 'market' as const,
    },
    {
      eyebrow: 'Active requests',
      value: String(data.active_requests),
      detail: 'Requests already moving through review or delivery.',
      icon: <ClipboardList className="size-5" />,
      variant: 'activity' as const,
    },
    {
      eyebrow: 'Protected bookings',
      value: String(data.protected_bookings),
      detail: 'Bookings already inside protected stages.',
      icon: <ShieldCheck className="size-5" />,
      variant: 'communication' as const,
    },
    {
      eyebrow: 'Awaiting payment',
      value: String(data.awaiting_payment_requests),
      detail: 'Requests waiting for the next payment step.',
      icon: <WalletCards className="size-5" />,
      variant: 'finance' as const,
    },
  ];

  const workingLanes = [
    {
      eyebrow: 'Lane 1',
      title: 'Discover the right business lane',
      description: 'Start with the request lanes, compare fit, and choose the one that best matches what you want WOLFIX to handle.',
      icon: <Compass className="size-5" />,
      accent: 'var(--accent-cyan)',
      tags: ['Discovery', 'Fit check'],
      actions: [
        { href: '/dashboard/request-services', label: 'Open lanes', icon: <Compass className="size-4" /> },
      ],
    },
    {
      eyebrow: 'Lane 2',
      title: 'Send and follow requests',
      description: 'Use the request lane to submit work clearly, then follow admin updates, pricing, and next platform instructions.',
      icon: <ClipboardList className="size-5" />,
      accent: 'var(--accent-violet)',
      tags: ['Requests', 'Follow-up'],
      actions: [
        { href: '/dashboard/requests', label: 'Open requests', icon: <ClipboardList className="size-4" />, variant: 'ghost' as const },
      ],
    },
    {
      eyebrow: 'Lane 3',
      title: 'Track protected bookings',
      description: 'Open bookings to monitor protected payment, delivery movement, and any dispute resolution tied to your live work.',
      icon: <ShieldCheck className="size-5" />,
      accent: 'var(--accent-teal)',
      tags: ['Protection', 'Delivery'],
      actions: [
        { href: '/dashboard', label: 'Open bookings', icon: <ShieldCheck className="size-4" />, variant: 'ghost' as const },
      ],
    },
    {
      eyebrow: 'Lane 4',
      title: 'Start with a known lane',
      description: 'If you want a faster start, jump straight into one of the business lanes clients open most often.',
      icon: <ShieldCheck className="size-5" />,
      accent: '#15803d',
      tags: ['Popular', 'Fast start'],
      actions: popularCategories.slice(0, 2).map((category) => ({
        href: `/dashboard/request-services?category=${encodeURIComponent(category)}`,
        label: category,
        icon: <ArrowRight className="size-4" />,
        variant: 'ghost' as const,
      })),
    },
  ];

  const popularLaneButtons = (
    <div className="flex flex-wrap gap-3">
      {popularCategories.map((category) => (
        <Link
          key={category}
          href={`/dashboard/request-services?category=${encodeURIComponent(category)}`}
        >
          <Button variant="ghost" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.08)]">
            {category}
          </Button>
        </Link>
      ))}
    </div>
  );

  return {
    data,
    isLoading,
    quickActions,
    summaryItems,
    pressureItems,
    heroActions,
    workspaceStats,
    workingLanes,
    popularLaneButtons,
  };
}

export type ClientDashboardModel = ReturnType<typeof useClientDashboard>;
