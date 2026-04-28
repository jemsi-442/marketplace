'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ClientRequestsContent } from './_components/client-requests-content';
import { ClientRequestsMobileActions } from './_components/client-requests-mobile-actions';
import { useClientRequests } from './use-client-requests';

export default function ClientRequestsPage() {
  const workspace = useClientRequests();

  return (
    <DashboardShell
      title="Requests"
      subtitle="Track your requests and open the next ready step."
      mobileQuickActions={<ClientRequestsMobileActions />}
    >
      <ClientRequestsContent workspace={workspace} />
    </DashboardShell>
  );
}
