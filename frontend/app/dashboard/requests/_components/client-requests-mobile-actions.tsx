'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function ClientRequestsMobileActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link href="/dashboard/request-services">
        <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
          New request
          <ArrowRight className="size-4" />
        </Button>
      </Link>
      <Link href="/dashboard">
        <Button
          variant="ghost"
          className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5"
        >
          Open bookings
          <ArrowRight className="size-4" />
        </Button>
      </Link>
    </div>
  );
}
