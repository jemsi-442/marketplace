'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function AdminUserCreateMobileActions() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Link href="/dashboard/admin-users">
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
        >
          Back
        </Button>
      </Link>
      <Link href="/dashboard/admin">
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
        >
          Admin
        </Button>
      </Link>
    </div>
  );
}
