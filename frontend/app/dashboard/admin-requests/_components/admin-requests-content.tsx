'use client';

import type { AdminRequestsModel } from '../use-admin-requests';
import { AdminRequestReviewBoard } from './admin-request-review-board';
import { AdminRequestSummaryTiles } from './admin-request-summary-tiles';

interface AdminRequestsContentProps {
  workspace: AdminRequestsModel;
}

export function AdminRequestsContent({
  workspace,
}: AdminRequestsContentProps) {
  return (
    <div className="space-y-6">
      <AdminRequestSummaryTiles
        activeView={workspace.statusView}
        summary={workspace.summary}
        onSelectView={workspace.actions.applyStatusView}
      />

      <AdminRequestReviewBoard
        currentPage={workspace.currentPage}
        isError={workspace.requests.isError}
        isLoading={workspace.requests.isLoading}
        requestItems={workspace.requestItems}
        resultSummary={workspace.resultSummary}
        search={workspace.search}
        statusView={workspace.statusView}
        summary={workspace.summary}
        totalPages={workspace.totalPages}
        onApplyStatusView={workspace.actions.applyStatusView}
        onPreviousPage={workspace.actions.goToPreviousPage}
        onNextPage={workspace.actions.goToNextPage}
        onSearchChange={workspace.actions.setSearch}
      />
    </div>
  );
}
