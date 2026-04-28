'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

import { VendorDashboardContent } from './_components/vendor-dashboard-content';
import { VendorDashboardMobileActions } from './_components/vendor-dashboard-mobile-actions';
import { useVendorDashboard } from './use-vendor-dashboard';

export default function VendorDashboardPage() {
  const workspace = useVendorDashboard();

  return (
    <DashboardShell
      title="Studio"
      subtitle="See readiness, demand, and protected work in one place."
      mobileQuickActions={<VendorDashboardMobileActions items={workspace.quickActions} />}
    >
      <div className="space-y-6">
        <VendorDashboardContent workspace={workspace} />
      </div>
    </DashboardShell>
  );
}
