'use client';

import { DashboardActionLinks } from '@/components/dashboard/dashboard-action-links';

interface VendorDashboardMobileActionsProps {
  items: React.ComponentProps<typeof DashboardActionLinks>['items'];
}

export function VendorDashboardMobileActions({
  items,
}: VendorDashboardMobileActionsProps) {
  return (
    <DashboardActionLinks
      columnsClassName="sm:grid-cols-2 lg:grid-cols-3"
      items={items}
    />
  );
}
