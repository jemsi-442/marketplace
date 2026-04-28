'use client';

import { AdminVerificationPageScreen } from './_components/admin-verification-page-screen';
import { useAdminVerificationDetail } from './use-admin-verification-detail';

export default function AdminVendorVerificationDetailPage() {
  const workspace = useAdminVerificationDetail();

  return <AdminVerificationPageScreen workspace={workspace} />;
}
