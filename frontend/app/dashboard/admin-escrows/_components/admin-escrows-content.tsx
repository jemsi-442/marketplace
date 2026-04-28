'use client';

import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

import type { AdminEscrowsModel } from '../use-admin-escrows';
import { AdminEscrowQueueCard } from './admin-escrow-queue-card';
import { AdminEscrowSummaryTiles } from './admin-escrow-summary-tiles';

interface AdminEscrowsContentProps {
  workspace: AdminEscrowsModel;
}

export function AdminEscrowsContent({
  workspace,
}: AdminEscrowsContentProps) {
  return (
    <div className="space-y-6">
      {workspace.feedback ? (
        <FeedbackBanner
          message={workspace.feedback}
          tone={inferFeedbackTone(workspace.feedback)}
          onDismiss={workspace.actions.dismissFeedback}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {workspace.escrows.isLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-32 rounded-[24px]"
            />
          ))
        ) : (
          <AdminEscrowSummaryTiles
            currentPage={workspace.currentPage}
            isLoading={workspace.escrows.isLoading}
            summary={workspace.summary}
            totalPages={workspace.totalPages}
          />
        )}
      </div>

      <AdminEscrowQueueCard
        currentPage={workspace.currentPage}
        evidenceSummaries={workspace.state.evidenceSummaries}
        isLoading={workspace.escrows.isLoading}
        items={workspace.items}
        pendingActions={workspace.state.pendingActions}
        resolutionNotes={workspace.state.resolutionNotes}
        search={workspace.search}
        tagInputs={workspace.state.tagInputs}
        totalPages={workspace.totalPages}
        onEvidenceSummaryChange={workspace.actions.setEvidenceSummary}
        onNextPage={workspace.actions.goToNextPage}
        onPreviousPage={workspace.actions.goToPreviousPage}
        onResolve={workspace.actions.resolveEscrow}
        onResolutionNoteChange={workspace.actions.setResolutionNote}
        onSearchChange={workspace.actions.setSearch}
        onTagInputChange={workspace.actions.setTagInput}
      />
    </div>
  );
}
