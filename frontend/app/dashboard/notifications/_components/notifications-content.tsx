'use client';

import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

import type { NotificationsModel } from '../use-notifications';
import { NotificationAdminOpsCards } from './notification-admin-ops-cards';
import { NotificationListCard } from './notification-list-card';
import { NotificationSummaryTiles } from './notification-summary-tiles';

interface NotificationsContentProps {
  workspace: NotificationsModel;
}

export function NotificationsContent({
  workspace,
}: NotificationsContentProps) {
  return (
    <div className="space-y-6">
      {workspace.feedback ? (
        <FeedbackBanner
          message={workspace.feedback}
          tone={inferFeedbackTone(workspace.feedback)}
          onDismiss={workspace.actions.dismissFeedback}
        />
      ) : null}

      {workspace.isAdmin &&
      (workspace.queries.opsOverview.data || workspace.feedbackRequestId) ? (
        <NotificationAdminOpsCards
          feedbackRequestId={workspace.feedbackRequestId}
          opsOverview={workspace.queries.opsOverview.data}
        />
      ) : null}

      <NotificationSummaryTiles
        filter={workspace.filter}
        total={workspace.queries.notifications.data?.summary.total ?? 0}
        unread={workspace.unreadCount}
        visible={workspace.queries.notifications.data?.summary.visible ?? 0}
        onApplyReadFilter={workspace.actions.applyReadFilter}
        onResetVisible={() => {
          workspace.actions.applyReadFilter('all');
          workspace.actions.applyCategoryFilter('all');
        }}
      />

      <NotificationListCard
        categoryFilter={workspace.categoryFilter}
        currentPage={workspace.currentPage}
        notifications={workspace.paginatedNotifications}
        notificationSearch={workspace.notificationSearch}
        pendingNotificationId={workspace.pendingNotificationId}
        totalPages={workspace.totalPages}
        isLoading={workspace.queries.notifications.isLoading}
        isMarkingRead={workspace.status.isMarkingRead}
        onApplyCategoryFilter={workspace.actions.applyCategoryFilter}
        onNotificationSearchChange={workspace.actions.setNotificationSearch}
        onMarkRead={workspace.actions.markRead}
        onPreviousPage={workspace.actions.goToPreviousPage}
        onNextPage={workspace.actions.goToNextPage}
      />
    </div>
  );
}
