'use client';

import { BriefcaseBusiness, MessagesSquare } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface DashboardBookingsMobileActionsProps {
  homeHref: string;
}

export function DashboardBookingsMobileActions({
  homeHref,
}: DashboardBookingsMobileActionsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link href={homeHref}>
        <Button
          variant="ghost"
          className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5"
        >
          Back
          <BriefcaseBusiness className="size-4" />
        </Button>
      </Link>
      <Link href="/dashboard/communications">
        <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
          Open inbox
          <MessagesSquare className="size-4" />
        </Button>
      </Link>
    </div>
  );
}
