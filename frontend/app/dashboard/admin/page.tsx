'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

import { AdminDashboardContent } from './_components/admin-dashboard-content';
import { AdminDashboardMobileActions } from './_components/admin-dashboard-mobile-actions';
import { useAdminDashboard } from './use-admin-dashboard';

export default function AdminDashboardPage() {
  const workspace = useAdminDashboard();

  return (
    <DashboardShell
      title="Operations"
      subtitle="Run the control desk from one place."
      mobileQuickActions={<AdminDashboardMobileActions items={workspace.quickActions} />}
    >
      <div className="space-y-6">
        <AdminDashboardContent workspace={workspace} />
      </div>
    </DashboardShell>
  );
}
