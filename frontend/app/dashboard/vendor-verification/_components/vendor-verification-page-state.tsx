'use client';

import { ShieldCheck } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface VendorVerificationPageStateProps {
  hasProfile: boolean;
  isError: boolean;
  isLoading: boolean;
}

export function VendorVerificationPageState({
  hasProfile,
  isError,
  isLoading,
}: VendorVerificationPageStateProps) {
  if (isLoading) {
    return (
      <>
        <Skeleton className="h-56 rounded-[30px]" />
        <Skeleton className="h-64 rounded-[30px]" />
        <Skeleton className="h-72 rounded-[30px]" />
      </>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<ShieldCheck className="size-5" />}
        title="Verification lane is not loading right now"
        description="Refresh and try again in a moment."
      />
    );
  }

  if (!hasProfile) {
    return (
      <EmptyState
        icon={<ShieldCheck className="size-5" />}
        title="Vendor profile is not ready yet"
        description="Create the vendor profile first, then come back here."
      />
    );
  }

  return null;
}
