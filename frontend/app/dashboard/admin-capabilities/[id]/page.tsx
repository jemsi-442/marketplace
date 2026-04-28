'use client';

import { useAdminCapabilityDetail } from '../use-admin-capability-detail';
import { AdminCapabilityDetailPageState } from './_components/admin-capability-detail-page-state';
import { AdminCapabilityMobileActions } from './_components/admin-capability-mobile-actions';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

export default function AdminCapabilityDetailPage() {
  const workspace = useAdminCapabilityDetail();

  return (
    <DashboardShell
      title="Capability review"
      subtitle="Approve this vendor lane or return it for changes."
      mobileQuickActions={<AdminCapabilityMobileActions />}
    >
      <div className="space-y-6">
        {workspace.feedback ? <FeedbackBanner message={workspace.feedback} tone={inferFeedbackTone(workspace.feedback)} onDismiss={workspace.actions.dismissFeedback} /> : null}

        <AdminCapabilityDetailPageState workspace={workspace} />
      </div>
    </DashboardShell>
  );
}
