'use client';

import { ArrowRight, WalletCards } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function VendorWithdrawalsMobileActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link href="/dashboard/vendor">
        <Button
          variant="ghost"
          className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5"
        >
          Back
          <ArrowRight className="size-4 rotate-180" />
        </Button>
      </Link>
      <Link href="/dashboard">
        <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
          Bookings
          <WalletCards className="size-4" />
        </Button>
      </Link>
    </div>
  );
}
