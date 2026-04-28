'use client';

import { ClientRequestPageScreen } from './_components/client-request-page-screen';
import { useClientRequestDetail } from './use-client-request-detail';

export default function ClientRequestDetailPage() {
  const workspace = useClientRequestDetail();

  return <ClientRequestPageScreen workspace={workspace} />;
}
