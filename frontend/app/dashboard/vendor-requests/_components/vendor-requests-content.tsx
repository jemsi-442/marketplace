'use client';

import type { VendorRequestsModel } from '../use-vendor-requests';
import { VendorRequestFeedCard } from './vendor-request-feed-card';
import { VendorRequestSummaryTiles } from './vendor-request-summary-tiles';

interface VendorRequestsContentProps {
  workspace: VendorRequestsModel;
}

export function VendorRequestsContent({
  workspace,
}: VendorRequestsContentProps) {
  const verificationDescription = workspace.queries.vendorSummary.data?.resume_uploaded
    ? 'Your resume is ready. Finish the interview and review first.'
    : 'Upload your resume and complete verification first.';

  return (
    <div className="space-y-6">
      <VendorRequestSummaryTiles
        proposalView={workspace.proposalView}
        summary={workspace.summary}
        onApplyProposalView={workspace.actions.applyProposalView}
      />

      <VendorRequestFeedCard
        currentPage={workspace.currentPage}
        proposalView={workspace.proposalView}
        requestItems={workspace.requestItems}
        resultSummary={workspace.resultSummary}
        search={workspace.search}
        summary={workspace.summary}
        totalPages={workspace.totalPages}
        verificationDescription={verificationDescription}
        verificationReady={workspace.verificationReady}
        isLoadingSummary={workspace.queries.vendorSummary.isLoading}
        isLoadingFeed={workspace.queries.requestFeed.isLoading}
        isFeedError={workspace.queries.requestFeed.isError}
        onApplyProposalView={workspace.actions.applyProposalView}
        onSearchChange={workspace.actions.setSearch}
        onPreviousPage={workspace.actions.goToPreviousPage}
        onNextPage={workspace.actions.goToNextPage}
      />
    </div>
  );
}
