'use client';

import { AdminUserDetailPageScreen } from './_components/admin-user-detail-page-screen';
import { useAdminUserDetail } from './use-admin-user-detail';

export default function AdminUserDetailPage() {
  const workspace = useAdminUserDetail();

  return <AdminUserDetailPageScreen workspace={workspace} />;
}
