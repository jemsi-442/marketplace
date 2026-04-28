'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function RequestServicesMobileActions() {
  return (
    <div className="grid gap-3">
      <Link href="/dashboard/client">
        <Button
          variant="ghost"
          className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5"
        >
          Back to workspace
          <ArrowRight className="size-4 rotate-180" />
        </Button>
      </Link>
    </div>
  );
}
