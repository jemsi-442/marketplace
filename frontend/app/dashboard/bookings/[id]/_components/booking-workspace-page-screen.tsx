'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

import type { BookingWorkspaceModel } from '../use-booking-workspace';
import { BookingWorkspaceBody } from './booking-workspace-body';
import { BookingWorkspaceMobileActions } from './booking-workspace-mobile-actions';

interface BookingWorkspacePageScreenProps {
  workspace: BookingWorkspaceModel;
}

export function BookingWorkspacePageScreen({
  workspace,
}: BookingWorkspacePageScreenProps) {
  return (
    <DashboardShell
      title="Booking"
      subtitle="Use this page for payment, delivery, and thread updates."
      mobileQuickActions={(
        <BookingWorkspaceMobileActions
          isAdmin={workspace.isAdmin}
          laneHref={workspace.laneHref}
          onJumpToThreadSection={workspace.actions.jumpToThreadSection}
        />
      )}
    >
      <BookingWorkspaceBody workspace={workspace} />
    </DashboardShell>
  );
}
