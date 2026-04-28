'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';

export function VendorCapabilitiesPageFallback() {
  return (
    <DashboardShell
      title="Capability lanes"
      subtitle="Start with one business lane first, then configure the exact capabilities inside that vendor lane."
    >
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[30px]" />
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-56 rounded-[28px]"
            />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
