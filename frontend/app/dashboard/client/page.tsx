'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

import { ClientDashboardContent } from './_components/client-dashboard-content';
import { ClientDashboardMobileActions } from './_components/client-dashboard-mobile-actions';
import { useClientDashboard } from './use-client-dashboard';

export default function ClientWelcomePage() {
  const workspace = useClientDashboard();

  return (
    <DashboardShell
      title="Workspace"
      subtitle="Start with discovery, then follow requests, payment, and protected work here."
      mobileQuickActions={<ClientDashboardMobileActions items={workspace.quickActions} />}
    >
      <div className="space-y-6">
        <ClientDashboardContent workspace={workspace} />
      </div>
    </DashboardShell>
  );
}
