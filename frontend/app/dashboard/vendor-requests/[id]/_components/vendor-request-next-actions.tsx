'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function VendorRequestNextActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/dashboard/vendor-requests"
        className="w-full sm:w-auto"
      >
        <Button
          className="w-full sm:w-auto"
          variant="ghost"
        >
          Back to requests
        </Button>
      </Link>
      <Link
        href="/dashboard/vendor-capabilities"
        className="w-full sm:w-auto"
      >
        <Button
          className="w-full sm:w-auto"
          variant="ghost"
        >
          Open capability lanes
        </Button>
      </Link>
    </div>
  );
}
