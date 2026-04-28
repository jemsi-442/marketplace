'use client';

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface RequestServicePlatformPromiseCardProps {
  continueHref: string;
}

export function RequestServicePlatformPromiseCard({
  continueHref,
}: RequestServicePlatformPromiseCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(16,185,129,0.12)] text-[var(--accent-teal)]">
          <ShieldCheck className="size-4" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            Platform promise
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            One managed update before money moves
          </h2>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
        This service stays inside the WOLFIX managed flow. Vendors do not pitch
        directly in the open.
      </p>
      <div className="mt-6">
        <Link href={continueHref}>
          <Button>Open request page</Button>
        </Link>
      </div>
    </Card>
  );
}
