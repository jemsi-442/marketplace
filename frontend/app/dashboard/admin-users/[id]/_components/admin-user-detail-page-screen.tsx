'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

import type { AdminUserDetailModel } from '../use-admin-user-detail';
import { AdminUserDetailMobileActions } from './admin-user-detail-mobile-actions';
import { AdminUserDetailPageState } from './admin-user-detail-page-state';

interface AdminUserDetailPageScreenProps {
  workspace: AdminUserDetailModel;
}

export function AdminUserDetailPageScreen({
  workspace,
}: AdminUserDetailPageScreenProps) {
  return (
    <DashboardShell
      title="User"
      subtitle="Update one account here, then go back to the list when you are done."
      mobileQuickActions={<AdminUserDetailMobileActions />}
    >
      <div className="space-y-6">
        {workspace.feedback ? (
          <FeedbackBanner
            message={workspace.feedback}
            tone={inferFeedbackTone(workspace.feedback)}
            onDismiss={workspace.actions.dismissFeedback}
          />
        ) : null}

        <AdminUserDetailPageState workspace={workspace} />
      </div>
    </DashboardShell>
  );
}
