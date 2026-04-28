'use client';

import { Boxes, Search } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

import { VendorCapabilityGroupCard } from './vendor-capability-group-card';
import type { VendorCapabilitiesModel } from '../use-vendor-capabilities';

interface VendorCapabilitiesPageStateProps {
  groups: VendorCapabilitiesModel['groups'];
  isError: boolean;
  isLoading: boolean;
  metricsByGroup: VendorCapabilitiesModel['metricsByGroup'];
}

export function VendorCapabilitiesPageState({
  groups,
  isError,
  isLoading,
  metricsByGroup,
}: VendorCapabilitiesPageStateProps) {
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
        icon={<Boxes className="size-5" />}
        title="Capability lanes are not loading right now"
        description="Refresh and try again in a moment."
      />
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<Search className="size-5" />}
        title="No capability lane matches this view"
        description="Try a broader search to reopen the full vendor capability map."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map((group) => (
        <VendorCapabilityGroupCard
          key={group.slug}
          group={group}
          metrics={metricsByGroup.get(group.slug)}
        />
      ))}
    </div>
  );
}
