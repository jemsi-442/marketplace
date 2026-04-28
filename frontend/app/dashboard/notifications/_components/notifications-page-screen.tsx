'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

import type { NotificationsModel } from '../use-notifications';
import { NotificationsContent } from './notifications-content';
import { NotificationsMobileActions } from './notifications-mobile-actions';

interface NotificationsPageScreenProps {
  workspace: NotificationsModel;
}

export function NotificationsPageScreen({
  workspace,
}: NotificationsPageScreenProps) {
  return (
    <DashboardShell
      title="Alerts"
      subtitle="Read alerts here, then open the related page when needed."
      mobileQuickActions={(
        <NotificationsMobileActions
          filter={workspace.filter}
          onToggleUnread={() =>
            workspace.actions.applyReadFilter(
              workspace.filter === 'unread' ? 'all' : 'unread',
            )
          }
        />
      )}
    >
      <NotificationsContent workspace={workspace} />
    </DashboardShell>
  );
}
