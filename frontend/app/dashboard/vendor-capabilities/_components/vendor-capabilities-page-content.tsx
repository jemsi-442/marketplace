'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

import { useVendorCapabilities } from '../use-vendor-capabilities';
import { VendorCapabilitiesContent } from './vendor-capabilities-content';
import { VendorCapabilitiesMobileActions } from './vendor-capabilities-mobile-actions';

export function VendorCapabilitiesPageContent() {
  const workspace = useVendorCapabilities();

  return (
    <DashboardShell
      title="Capability lanes"
      subtitle="Start with one business lane first, then configure the exact capabilities your team can deliver well inside that vendor lane."
      mobileQuickActions={<VendorCapabilitiesMobileActions />}
    >
      <VendorCapabilitiesContent workspace={workspace} />
    </DashboardShell>
  );
}
