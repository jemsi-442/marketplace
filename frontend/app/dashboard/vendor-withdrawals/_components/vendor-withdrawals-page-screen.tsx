'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

import type { VendorWithdrawalsModel } from '../use-vendor-withdrawals';
import { VendorWithdrawalsContent } from './vendor-withdrawals-content';
import { VendorWithdrawalsMobileActions } from './vendor-withdrawals-mobile-actions';
import { VendorWithdrawalsPageState } from './vendor-withdrawals-page-state';

interface VendorWithdrawalsPageScreenProps {
  workspace: VendorWithdrawalsModel;
}

export function VendorWithdrawalsPageScreen({
  workspace,
}: VendorWithdrawalsPageScreenProps) {
  if (!workspace.hydrated || (workspace.user && !workspace.isVendor)) {
    return (
      <VendorWithdrawalsPageState
        hydrated={workspace.hydrated}
        isVendor={workspace.isVendor}
        hasUser={Boolean(workspace.user)}
      />
    );
  }

  return (
    <DashboardShell
      title="Withdrawals"
      subtitle="Move available vendor balance into your mobile money account from one clean page."
      mobileQuickActions={<VendorWithdrawalsMobileActions />}
    >
      <VendorWithdrawalsContent workspace={workspace} />
    </DashboardShell>
  );
}
