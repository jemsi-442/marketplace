'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

import type { AdminVerificationDetailModel } from '../use-admin-verification-detail';
import { AdminVerificationDetailPageState } from './admin-verification-detail-page-state';
import { AdminVerificationMobileActions } from './admin-verification-mobile-actions';

interface AdminVerificationPageScreenProps {
  workspace: AdminVerificationDetailModel;
}

export function AdminVerificationPageScreen({
  workspace,
}: AdminVerificationPageScreenProps) {
  return (
    <DashboardShell
      title="Vendor verification"
      subtitle="Review resume evidence, interview answers, and trust status."
      mobileQuickActions={(
        <AdminVerificationMobileActions
          canDownloadResume={Boolean(workspace.data?.resume_uploaded)}
          isPreparingResumeLink={workspace.queries.resumeLink.isFetching && !workspace.resumeUrl}
          onDownloadResume={workspace.actions.downloadResume}
        />
      )}
    >
      <div className="space-y-6">
        <AdminVerificationDetailPageState workspace={workspace} />
      </div>
    </DashboardShell>
  );
}
