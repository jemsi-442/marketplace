'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function AdminRequestMobileActions() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Link href="/dashboard/admin-requests">
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
        >
          Back
        </Button>
      </Link>
      <Link href="/dashboard/communications">
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
        >
          Inbox
        </Button>
      </Link>
    </div>
  );
}
