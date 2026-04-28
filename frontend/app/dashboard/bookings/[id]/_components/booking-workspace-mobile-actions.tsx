'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface BookingWorkspaceMobileActionsProps {
  isAdmin: boolean;
  laneHref: string;
  onJumpToThreadSection: () => void;
}

export function BookingWorkspaceMobileActions({
  isAdmin,
  laneHref,
  onJumpToThreadSection,
}: BookingWorkspaceMobileActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Link href={laneHref}>
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
      {!isAdmin ? (
        <Button
          size="sm"
          className="w-full"
          onClick={onJumpToThreadSection}
        >
          Thread
        </Button>
      ) : null}
    </div>
  );
}
