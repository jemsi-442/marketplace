'use client';

import { InlineStateNote } from '@/components/ui/inline-state-note';

import type { VendorCapabilitiesModel } from '../use-vendor-capabilities';
import { VendorCapabilitiesHero } from './vendor-capabilities-hero';
import { VendorCapabilityGuidanceGrid } from './vendor-capability-guidance-grid';
import { VendorCapabilitiesPageState } from './vendor-capabilities-page-state';

interface VendorCapabilitiesContentProps {
  workspace: VendorCapabilitiesModel;
}

export function VendorCapabilitiesContent({
  workspace,
}: VendorCapabilitiesContentProps) {
  return (
    <div className="space-y-6">
      <VendorCapabilitiesHero
        businessLaneCount={workspace.queries.serviceGroupsQuery.data?.length ?? 0}
        deepestLaneLabel={workspace.densestGroup?.title ?? 'Loading...'}
        reviewPressure={workspace.reviewPressure}
        search={workspace.search}
        totalActiveCapabilities={workspace.totalActiveCapabilities}
        onSearchChange={workspace.actions.setSearch}
      />

      <VendorCapabilityGuidanceGrid />

      <VendorCapabilitiesPageState
        groups={workspace.groups}
        isError={workspace.state.isError}
        isLoading={workspace.state.isLoading}
        metricsByGroup={workspace.metricsByGroup}
      />

      <InlineStateNote
        tone="info"
        message="Only saved capability lanes can move into vendor verification. Once verification passes, matched requests open with the right review state, price, proof, and turnaround context."
      />
    </div>
  );
}
