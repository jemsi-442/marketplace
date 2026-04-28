'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DashboardBookingsContent } from './_components/dashboard-bookings-content';
import { DashboardBookingsMobileActions } from './_components/dashboard-bookings-mobile-actions';
import { useDashboardBookings } from './use-dashboard-bookings';

export default function DashboardBookingsPage() {
  const workspace = useDashboardBookings();

  return (
    <DashboardShell
      title="Bookings"
      subtitle="Open a booking when you need payment, delivery, or thread details."
      mobileQuickActions={<DashboardBookingsMobileActions homeHref={workspace.homeHref} />}
    >
      <DashboardBookingsContent workspace={workspace} />
    </DashboardShell>
  );
}
