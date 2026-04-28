'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AdminUserCreateContent } from './_components/admin-user-create-content';
import { AdminUserCreateMobileActions } from './_components/admin-user-create-mobile-actions';
import { useAdminUserCreate } from './use-admin-user-create';

export default function AdminNewUserPage() {
  const workspace = useAdminUserCreate();

  return (
    <DashboardShell
      title="New user"
      subtitle="Create one account here, then move to the user page only if more changes are needed."
      mobileQuickActions={<AdminUserCreateMobileActions />}
    >
      <AdminUserCreateContent workspace={workspace} />
    </DashboardShell>
  );
}
