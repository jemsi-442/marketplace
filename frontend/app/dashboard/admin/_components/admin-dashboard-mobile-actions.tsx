'use client';

import { DashboardActionLinks } from '@/components/dashboard/dashboard-action-links';

interface AdminDashboardMobileActionsProps {
  items: React.ComponentProps<typeof DashboardActionLinks>['items'];
}

export function AdminDashboardMobileActions({
  items,
}: AdminDashboardMobileActionsProps) {
  return (
    <DashboardActionLinks
      columnsClassName="sm:grid-cols-2 lg:grid-cols-3"
      items={items}
    />
  );
}
