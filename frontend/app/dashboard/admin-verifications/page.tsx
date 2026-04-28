'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AdminVerificationsContent } from './_components/admin-verifications-content';
import { AdminVerificationsMobileActions } from './_components/admin-verifications-mobile-actions';
import { useAdminVerifications } from './use-admin-verifications';

export default function AdminVendorVerificationsPage() {
  const workspace = useAdminVerifications();

  return (
    <DashboardShell
      title="Vendor verification"
      subtitle="Review resume evidence, interview answers, and blue tick status."
      mobileQuickActions={<AdminVerificationsMobileActions />}
    >
      <AdminVerificationsContent workspace={workspace} />
    </DashboardShell>
  );
}
