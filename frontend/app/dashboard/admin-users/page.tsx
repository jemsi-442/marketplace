'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AdminUsersContent } from './_components/admin-users-content';
import { AdminUsersMobileActions } from './_components/admin-users-mobile-actions';
import { useAdminUsers } from './use-admin-users';

export default function AdminUsersPage() {
  const workspace = useAdminUsers();

  return (
    <DashboardShell
      title="Users"
      subtitle="Keep the list here. Open a user page only when you need to manage one account."
      mobileQuickActions={<AdminUsersMobileActions />}
    >
      <AdminUsersContent workspace={workspace} />
    </DashboardShell>
  );
}
