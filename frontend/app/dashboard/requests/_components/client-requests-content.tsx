'use client';

import type { ClientRequestsModel } from '../use-client-requests';
import { ClientRequestListCard } from './client-request-list-card';
import { ClientRequestSummaryTiles } from './client-request-summary-tiles';

interface ClientRequestsContentProps {
  workspace: ClientRequestsModel;
}

export function ClientRequestsContent({
  workspace,
}: ClientRequestsContentProps) {
  return (
    <div className="space-y-6">
      <ClientRequestSummaryTiles
        activeView={workspace.statusView}
        summary={workspace.summary}
        onSelectView={workspace.actions.applyStatusView}
      />

      <ClientRequestListCard
        currentPage={workspace.currentPage}
        requestItems={workspace.requestItems}
        statusView={workspace.statusView}
        summary={workspace.summary}
        totalPages={workspace.totalPages}
        isLoading={workspace.queries.requestsQuery.isLoading}
        isError={workspace.queries.requestsQuery.isError}
        onApplyStatusView={workspace.actions.applyStatusView}
        onPreviousPage={workspace.actions.goToPreviousPage}
        onNextPage={workspace.actions.goToNextPage}
      />
    </div>
  );
}
