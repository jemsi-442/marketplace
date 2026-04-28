'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { VendorRequestsContent } from './_components/vendor-requests-content';
import { VendorRequestsMobileActions } from './_components/vendor-requests-mobile-actions';
import { useVendorRequests } from './use-vendor-requests';

export default function VendorRequestsPage() {
  const workspace = useVendorRequests();

  return (
    <DashboardShell
      title="Requests"
      subtitle="Open matched requests here and send clear proposals."
      mobileQuickActions={<VendorRequestsMobileActions />}
    >
      <VendorRequestsContent workspace={workspace} />
    </DashboardShell>
  );
}
