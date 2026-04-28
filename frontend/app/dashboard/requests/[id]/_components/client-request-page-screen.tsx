'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

import type { ClientRequestDetailModel } from '../use-client-request-detail';
import { ClientRequestDetailPageState } from './client-request-detail-page-state';
import { ClientRequestMobileActions } from './client-request-mobile-actions';
import { ClientRequestNextActions } from './client-request-next-actions';

interface ClientRequestPageScreenProps {
  workspace: ClientRequestDetailModel;
}

export function ClientRequestPageScreen({
  workspace,
}: ClientRequestPageScreenProps) {
  return (
    <DashboardShell
      title="Request"
      subtitle="Read the update here, then take the next ready step."
      mobileQuickActions={(
        <ClientRequestMobileActions
          canOpenBooking={workspace.canOpenBooking}
          isOpeningBooking={workspace.status.isOpeningBooking}
          onOpenBooking={workspace.actions.openBooking}
        />
      )}
    >
      <div className="space-y-6">
        {workspace.feedback ? (
          <FeedbackBanner
            message={workspace.feedback}
            tone={inferFeedbackTone(workspace.feedback)}
            onDismiss={workspace.actions.dismissFeedback}
          />
        ) : null}

        <ClientRequestDetailPageState workspace={workspace} />

        <ClientRequestNextActions />
      </div>
    </DashboardShell>
  );
}
