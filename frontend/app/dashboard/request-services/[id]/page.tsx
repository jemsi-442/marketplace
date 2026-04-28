'use client';

import { RequestServicePageScreen } from './_components/request-service-page-screen';
import { useRequestServiceDetail } from './use-request-service-detail';

export default function RequestServiceDetailPage() {
  const workspace = useRequestServiceDetail();

  return <RequestServicePageScreen workspace={workspace} />;
}
