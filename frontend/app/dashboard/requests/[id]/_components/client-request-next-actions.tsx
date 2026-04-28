'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function ClientRequestNextActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/dashboard/requests"
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
        href="/dashboard/request-services"
        className="w-full sm:w-auto"
      >
        <Button
          className="w-full sm:w-auto"
          variant="ghost"
        >
          Open lanes
        </Button>
      </Link>
    </div>
  );
}
