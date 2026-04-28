'use client';

import type { AdminVerificationsModel } from '../use-admin-verifications';
import { AdminVerificationListCard } from './admin-verification-list-card';
import { AdminVerificationSummaryTiles } from './admin-verification-summary-tiles';

interface AdminVerificationsContentProps {
  workspace: AdminVerificationsModel;
}

export function AdminVerificationsContent({
  workspace,
}: AdminVerificationsContentProps) {
  return (
    <div className="space-y-6">
      <AdminVerificationSummaryTiles
        activeFilter={workspace.filter}
        summary={workspace.summary}
        onSelectFilter={workspace.actions.applyFilter}
      />

      <AdminVerificationListCard
        currentPage={workspace.currentPage}
        filter={workspace.filter}
        isError={workspace.queries.verificationsQuery.isError}
        isLoading={workspace.queries.verificationsQuery.isLoading}
        items={workspace.items}
        resultSummary={workspace.resultSummary}
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
