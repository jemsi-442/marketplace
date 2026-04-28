'use client';

import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

import type { CommunicationsModel } from '../use-communications';
import { CommunicationSummaryTiles } from './communication-summary-tiles';
import { CommunicationsConversationPanel } from './communications-conversation-panel';
import { CommunicationsThreadsPanel } from './communications-threads-panel';

interface CommunicationsContentProps {
  workspace: CommunicationsModel;
}

export function CommunicationsContent({
  workspace,
}: CommunicationsContentProps) {
  return (
    <div className="space-y-6">
      {workspace.feedback ? (
        <FeedbackBanner
          message={workspace.feedback}
          tone={inferFeedbackTone(workspace.feedback)}
          onDismiss={workspace.actions.dismissFeedback}
        />
      ) : null}

      <CommunicationSummaryTiles
        activeFilter={workspace.threadFilter}
        summary={workspace.summary}
        onSelectFilter={workspace.actions.applyThreadFilter}
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <CommunicationsThreadsPanel
          currentPage={workspace.currentPage}
          isLoading={workspace.threadSummaries.isLoading}
          items={workspace.paginatedThreadItems}
          search={workspace.search}
          selectedThreadKey={workspace.selectedThreadKey}
          threadFilter={workspace.threadFilter}
          totalPages={workspace.totalPages}
          onApplyFilter={workspace.actions.applyThreadFilter}
          onPreviousPage={workspace.actions.goToPreviousPage}
          onNextPage={workspace.actions.goToNextPage}
          onSearchChange={workspace.actions.setSearch}
          onSelectThread={workspace.actions.selectThread}
        />

        <CommunicationsConversationPanel
          draftMessage={workspace.draftMessage}
          isMessagesError={workspace.threadMessages.isError}
          isMessagesLoading={workspace.threadMessages.isLoading}
          messages={workspace.threadMessages.data ?? []}
          selectedThread={workspace.selectedThread}
          sendPending={workspace.sendPending}
          user={workspace.user}
          onDraftMessageChange={workspace.actions.setDraftMessage}
          onSendMessage={workspace.actions.sendMessage}
        />
      </div>
    </div>
  );
}
