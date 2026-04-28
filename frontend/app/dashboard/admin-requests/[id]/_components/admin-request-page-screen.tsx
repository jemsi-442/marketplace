'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

import type { AdminRequestDetailModel } from '../../use-admin-request-detail';
import { AdminRequestDetailPageState } from './admin-request-detail-page-state';
import { AdminRequestFeedbackReferenceCard } from './admin-request-feedback-reference-card';
import { AdminRequestMobileActions } from './admin-request-mobile-actions';
import { AdminRequestNextActions } from './admin-request-next-actions';

interface AdminRequestPageScreenProps {
  workspace: AdminRequestDetailModel;
}

export function AdminRequestPageScreen({
  workspace,
}: AdminRequestPageScreenProps) {
  return (
    <DashboardShell
      title="Request review"
      subtitle="Read the brief, choose one proposal, and send one final platform update."
      mobileQuickActions={<AdminRequestMobileActions />}
    >
      <div className="space-y-6">
        {workspace.feedback ? (
          <FeedbackBanner
            message={workspace.feedback}
            tone={inferFeedbackTone(workspace.feedback)}
            onDismiss={workspace.actions.dismissFeedback}
          />
        ) : null}
        {workspace.feedbackRequestId ? (
          <AdminRequestFeedbackReferenceCard
            requestId={workspace.feedbackRequestId}
          />
        ) : null}

        <AdminRequestDetailPageState workspace={workspace} />

        <AdminRequestNextActions />
      </div>
    </DashboardShell>
  );
}
