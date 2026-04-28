'use client';

import { Suspense } from 'react';

import { RequestServicesPageContent } from './_components/request-services-page-content';
import { RequestServicesPageFallback } from './_components/request-services-page-fallback';

export default function RequestServicesPage() {
  return (
    <Suspense fallback={<RequestServicesPageFallback />}>
      <RequestServicesPageContent />
    </Suspense>
  );
}
