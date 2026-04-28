'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';

interface VendorWithdrawalsPageStateProps {
  hydrated: boolean;
  isVendor: boolean;
  hasUser: boolean;
}

export function VendorWithdrawalsPageState({
  hydrated,
  isVendor,
  hasUser,
}: VendorWithdrawalsPageStateProps) {
  if (!hydrated) {
    return (
      <DashboardShell
        title="Withdrawals"
        subtitle="Loading your vendor payout lane."
      >
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-[24px]" />
          <Skeleton className="h-80 rounded-[28px]" />
        </div>
      </DashboardShell>
    );
  }

  if (hasUser && !isVendor) {
    return null;
  }

  return null;
}
