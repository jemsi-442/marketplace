'use client';

import { Search } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

import type { RequestServicesModel } from '../use-request-services';
import { RequestServiceGroupCard } from './request-service-group-card';

interface RequestServicesPageStateProps {
  groups: RequestServicesModel['groups'];
  isError: boolean;
  isLoading: boolean;
}

export function RequestServicesPageState({
  groups,
  isError,
  isLoading,
}: RequestServicesPageStateProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-56 rounded-[28px]"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<Search className="size-5" />}
        title="Business lanes are not loading right now"
        description="Refresh and try again in a moment."
      />
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<Search className="size-5" />}
        title="No business lane matches this search"
        description="Try a broader term or clear the search."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map((group) => (
        <RequestServiceGroupCard
          key={group.slug}
          group={group}
        />
      ))}
    </div>
  );
}
