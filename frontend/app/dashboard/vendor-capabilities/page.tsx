'use client';

import { Suspense } from 'react';

import { VendorCapabilitiesPageContent } from './_components/vendor-capabilities-page-content';
import { VendorCapabilitiesPageFallback } from './_components/vendor-capabilities-page-fallback';

export default function VendorCapabilitiesPage() {
  return (
    <Suspense fallback={<VendorCapabilitiesPageFallback />}>
      <VendorCapabilitiesPageContent />
    </Suspense>
  );
}
