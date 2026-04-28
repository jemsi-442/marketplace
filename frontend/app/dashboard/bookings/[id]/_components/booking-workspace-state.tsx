'use client';

import { ShieldAlert } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface BookingWorkspaceStateProps {
  hasBooking: boolean;
  isError: boolean;
  isLoading: boolean;
}

export function BookingWorkspaceState({
  hasBooking,
  isError,
  isLoading,
}: BookingWorkspaceStateProps) {
  if (isLoading) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>
    );
  }

  if (isError || !hasBooking) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-5" />}
        title="This booking is not loading right now"
        description="Refresh and try again in a moment."
      />
    );
  }

  return null;
}
