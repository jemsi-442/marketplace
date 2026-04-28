'use client';

import { ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function AdminUsersMobileActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link href="/dashboard/admin">
        <Button
          variant="ghost"
          className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5"
        >
          Back to admin
          <ArrowRight className="size-4 rotate-180" />
        </Button>
      </Link>
      <Link href="/dashboard/admin-users/new">
        <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
          New user
          <Users className="size-4" />
        </Button>
      </Link>
    </div>
  );
}
