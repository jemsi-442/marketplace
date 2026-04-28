'use client';

import { DashboardActionLinks } from '@/components/dashboard/dashboard-action-links';

interface ClientDashboardMobileActionsProps {
  items: React.ComponentProps<typeof DashboardActionLinks>['items'];
}

export function ClientDashboardMobileActions({
  items,
}: ClientDashboardMobileActionsProps) {
  return (
    <DashboardActionLinks
      columnsClassName="sm:grid-cols-2"
      items={items}
    />
  );
}
