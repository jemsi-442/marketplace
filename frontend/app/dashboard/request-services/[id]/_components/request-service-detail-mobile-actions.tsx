'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface RequestServiceDetailMobileActionsProps {
  backHref: string;
  continueHref: string;
}

export function RequestServiceDetailMobileActions({
  backHref,
  continueHref,
}: RequestServiceDetailMobileActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Link href={backHref}>
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
        >
          Back
        </Button>
      </Link>
      <Link href={continueHref}>
        <Button
          size="sm"
          className="w-full"
        >
          Continue
        </Button>
      </Link>
    </div>
  );
}
