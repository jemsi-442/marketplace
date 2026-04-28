'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { VendorVerificationContent } from './_components/vendor-verification-content';
import { VendorVerificationMobileActions } from './_components/vendor-verification-mobile-actions';
import { useVendorVerification } from './use-vendor-verification';

export default function VendorVerificationPage() {
  const workspace = useVendorVerification();

  return (
    <DashboardShell
      title="Verification"
      subtitle="Upload your resume, answer the interview, and earn the blue tick."
      mobileQuickActions={<VendorVerificationMobileActions />}
    >
      <div className="space-y-6">
        <VendorVerificationContent workspace={workspace} />
      </div>
    </DashboardShell>
  );
}
