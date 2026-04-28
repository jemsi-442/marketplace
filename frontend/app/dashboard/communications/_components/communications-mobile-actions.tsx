'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface CommunicationsMobileActionsProps {
  currentWorkspaceHref: string;
  openPageHref: string | null;
}

export function CommunicationsMobileActions({
  currentWorkspaceHref,
  openPageHref,
}: CommunicationsMobileActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Link href={currentWorkspaceHref}>
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
        >
          Back
        </Button>
      </Link>
      {openPageHref ? (
        <Link href={openPageHref}>
          <Button
            size="sm"
            className="w-full"
          >
            Open page
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
