'use client';

import type { AdminCapabilitiesModel } from '../use-admin-capabilities';
import { AdminCapabilitiesHero } from './admin-capabilities-hero';
import { AdminCapabilitiesReviewBoard } from './admin-capabilities-review-board';
import { AdminCapabilitiesSummaryTiles } from './admin-capabilities-summary-tiles';

interface AdminCapabilitiesContentProps {
  workspace: AdminCapabilitiesModel;
}

export function AdminCapabilitiesContent({
  workspace,
}: AdminCapabilitiesContentProps) {
  return (
    <div className="space-y-6">
      <AdminCapabilitiesHero
        visibleLaneCount={workspace.visibleLaneCount}
        pendingCount={workspace.summary.pending}
        returnedCount={workspace.summary.returned}
      />

      <AdminCapabilitiesSummaryTiles
        activeFilter={workspace.filter}
        summary={workspace.summary}
        onSelectFilter={workspace.actions.applyFilter}
      />

      <AdminCapabilitiesReviewBoard
        currentPage={workspace.currentPage}
        filter={workspace.filter}
        groupedItems={workspace.groupedItems}
        hasItems={workspace.items.length > 0}
        isError={workspace.capabilities.isError}
        isLoading={workspace.capabilities.isLoading}
        search={workspace.search}
        totalPages={workspace.totalPages}
        onApplyFilter={workspace.actions.applyFilter}
        onPreviousPage={workspace.actions.goToPreviousPage}
        onNextPage={workspace.actions.goToNextPage}
        onSearchChange={workspace.actions.setSearch}
      />
    </div>
  );
}
