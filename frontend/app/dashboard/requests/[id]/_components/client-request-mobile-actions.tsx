'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface ClientRequestMobileActionsProps {
  canOpenBooking: boolean;
  isOpeningBooking: boolean;
  onOpenBooking: () => void;
}

export function ClientRequestMobileActions({
  canOpenBooking,
  isOpeningBooking,
  onOpenBooking,
}: ClientRequestMobileActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Link href="/dashboard/requests">
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
      {canOpenBooking ? (
        <Button
          size="sm"
          className="w-full"
          onClick={onOpenBooking}
          disabled={isOpeningBooking}
        >
          {isOpeningBooking ? 'Opening...' : 'Booking'}
        </Button>
      ) : null}
    </div>
  );
}
