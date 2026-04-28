'use client';

import { VendorRequestPageScreen } from './_components/vendor-request-page-screen';
import { useVendorRequestDetail } from './use-vendor-request-detail';

export default function VendorRequestDetailPage() {
  const workspace = useVendorRequestDetail();

  return <VendorRequestPageScreen workspace={workspace} />;
}
