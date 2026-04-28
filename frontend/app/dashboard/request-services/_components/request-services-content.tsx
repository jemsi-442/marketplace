'use client';

import { InlineStateNote } from '@/components/ui/inline-state-note';

import type { RequestServicesModel } from '../use-request-services';
import { RequestServiceGuidanceGrid } from './request-service-guidance-grid';
import { RequestServicesHero } from './request-services-hero';
import { RequestServicesPageState } from './request-services-page-state';

interface RequestServicesContentProps {
  workspace: RequestServicesModel;
}

export function RequestServicesContent({
  workspace,
}: RequestServicesContentProps) {
  return (
    <div className="space-y-6">
      <RequestServicesHero
        businessLaneCount={workspace.queries.serviceGroupsQuery.data?.length ?? 0}
        deepestLaneLabel={workspace.densestGroup?.title ?? 'Loading...'}
        search={workspace.search}
        totalServices={workspace.totalServices}
        onSearchChange={workspace.actions.setSearch}
      />

      <RequestServiceGuidanceGrid />

      <div className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">
            Business lanes
          </p>
          <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">
            Open the lane that matches your work
          </h3>
        </div>

        <RequestServicesPageState
          groups={workspace.groups}
          isError={workspace.queries.serviceGroupsQuery.isError}
          isLoading={workspace.queries.serviceGroupsQuery.isLoading}
        />
      </div>

      <InlineStateNote
        tone="info"
        message="Each lane page keeps its own services and search focused."
      />
    </div>
  );
}
