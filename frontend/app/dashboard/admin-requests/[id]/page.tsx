'use client';

import { useAdminRequestDetail } from '../use-admin-request-detail';
import { AdminRequestPageScreen } from './_components/admin-request-page-screen';

export default function AdminRequestDetailPage() {
  const workspace = useAdminRequestDetail();

  return <AdminRequestPageScreen workspace={workspace} />;
}
