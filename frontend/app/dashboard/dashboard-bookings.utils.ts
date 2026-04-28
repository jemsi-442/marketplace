import type { BookingRecord } from '@/lib/types';

export const PAGE_SIZE = 10;
export const BOOKINGS_PAGE_STALE_MS = 60_000;

export type DashboardBookingView = 'all' | 'active' | 'protected' | 'unread';

export const dashboardBookingViewOptions: Array<{
  value: DashboardBookingView;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'protected', label: 'Protected' },
  { value: 'unread', label: 'Unread' },
];

export function formatDashboardBookingMoney(
  amount?: number | null,
  currency = 'TZS',
): string {
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

export function getDashboardHomeHref(roles: string[]): string {
  const isAdmin =
    roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');

  if (isAdmin) {
    return '/dashboard/admin';
  }

  if (isVendor) {
    return '/dashboard/vendor';
  }

  return '/dashboard/client';
}

export function getDashboardBookingSummaryCards(summary: {
  active: number;
  protected: number;
  unread: number;
}): Array<{
  label: string;
  value: string;
  view: Exclude<DashboardBookingView, 'all'>;
}> {
  return [
    { label: 'Active bookings', value: String(summary.active), view: 'active' },
    {
      label: 'Protected payments',
      value: String(summary.protected),
      view: 'protected',
    },
    { label: 'Unread updates', value: String(summary.unread), view: 'unread' },
  ];
}

export function getDashboardBookingMeta(booking: BookingRecord): string[] {
  return [
    `Booking #${booking.id}`,
    booking.service_category || 'General service',
    booking.escrow
      ? formatDashboardBookingMoney(
          booking.escrow.amount_minor,
          booking.escrow.currency,
        )
      : 'Payment not protected yet',
  ];
}
