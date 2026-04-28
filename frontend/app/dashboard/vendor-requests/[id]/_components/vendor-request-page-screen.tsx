'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

import type { VendorRequestDetailModel } from '../use-vendor-request-detail';
import { VendorRequestDetailPageState } from './vendor-request-detail-page-state';
import { VendorRequestMobileActions } from './vendor-request-mobile-actions';
import { VendorRequestNextActions } from './vendor-request-next-actions';

interface VendorRequestPageScreenProps {
  workspace: VendorRequestDetailModel;
}

export function VendorRequestPageScreen({
  workspace,
}: VendorRequestPageScreenProps) {
  return (
    <DashboardShell
      title="Request"
      subtitle="Read the request, send one clear proposal, then wait for admin review."
      mobileQuickActions={<VendorRequestMobileActions />}
    >
      <div className="space-y-6">
        {workspace.feedback ? (
          <FeedbackBanner
            message={workspace.feedback}
            tone={inferFeedbackTone(workspace.feedback)}
            onDismiss={workspace.actions.dismissFeedback}
          />
        ) : null}

        <VendorRequestDetailPageState workspace={workspace} />

        <VendorRequestNextActions />
      </div>
    </DashboardShell>
  );
}
