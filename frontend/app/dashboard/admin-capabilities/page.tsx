'use client';

import { AdminCapabilitiesContent } from './_components/admin-capabilities-content';
import { AdminCapabilitiesMobileActions } from './_components/admin-capabilities-mobile-actions';
import { useAdminCapabilities } from './use-admin-capabilities';

import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function AdminCapabilitiesPage() {
  const workspace = useAdminCapabilities();

  return (
    <DashboardShell
      title="Capability lanes"
      subtitle="Review vendor lanes here before they receive matched work."
      mobileQuickActions={<AdminCapabilitiesMobileActions />}
    >
      <AdminCapabilitiesContent workspace={workspace} />
    </DashboardShell>
  );
}
