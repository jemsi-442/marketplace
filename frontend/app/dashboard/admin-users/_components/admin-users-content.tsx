'use client';

import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

import type { AdminUsersModel } from '../use-admin-users';
import { AdminUserListCard } from './admin-user-list-card';
import { AdminUserSummaryTiles } from './admin-user-summary-tiles';

interface AdminUsersContentProps {
  workspace: AdminUsersModel;
}

export function AdminUsersContent({
  workspace,
}: AdminUsersContentProps) {
  return (
    <div className="space-y-6">
      {workspace.feedback ? (
        <FeedbackBanner
          message={workspace.feedback}
          tone={inferFeedbackTone(workspace.feedback)}
          onDismiss={workspace.actions.dismissFeedback}
        />
      ) : null}

      <AdminUserSummaryTiles
        filter={workspace.filter}
        summary={workspace.summary}
        onApplyFilter={workspace.actions.applyFilter}
      />

      <AdminUserListCard
        currentPage={workspace.currentPage}
        filter={workspace.filter}
        paginatedUsers={workspace.paginatedUsers}
        search={workspace.search}
        totalPages={workspace.totalPages}
        isLoading={workspace.queries.users.isLoading}
        isError={workspace.queries.users.isError}
        onApplyFilter={workspace.actions.applyFilter}
        onSearchChange={workspace.actions.setSearch}
        onPreviousPage={workspace.actions.goToPreviousPage}
        onNextPage={workspace.actions.goToNextPage}
      />
    </div>
  );
}
