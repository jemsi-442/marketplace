'use client';

import { AdminEscrowsContent } from './_components/admin-escrows-content';
import { AdminEscrowsMobileActions } from './_components/admin-escrows-mobile-actions';
import { useAdminEscrows } from './use-admin-escrows';

import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function AdminEscrowsPage() {
  const workspace = useAdminEscrows();

  return (
    <DashboardShell
      title="Disputes"
      subtitle="Review disputed escrows, then resolve each case in favor of the vendor or the client."
      mobileQuickActions={<AdminEscrowsMobileActions />}
    >
      <AdminEscrowsContent workspace={workspace} />
    </DashboardShell>
  );
}
