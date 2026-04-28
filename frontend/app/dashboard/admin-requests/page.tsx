'use client';

import { AdminRequestsContent } from './_components/admin-requests-content';
import { AdminRequestsMobileActions } from './_components/admin-requests-mobile-actions';
import { useAdminRequests } from './use-admin-requests';

import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function AdminRequestsPage() {
  const workspace = useAdminRequests();

  return (
    <DashboardShell
      title="Requests"
      subtitle="Review requests, compare proposals, and prepare the next step."
      mobileQuickActions={<AdminRequestsMobileActions />}
    >
      <AdminRequestsContent workspace={workspace} />
    </DashboardShell>
  );
}
