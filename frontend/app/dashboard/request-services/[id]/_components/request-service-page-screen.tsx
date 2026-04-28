'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

import type { RequestServiceDetailModel } from '../use-request-service-detail';
import { RequestServiceDetailMobileActions } from './request-service-detail-mobile-actions';
import { RequestServiceDetailPageState } from './request-service-detail-page-state';

interface RequestServicePageScreenProps {
  workspace: RequestServiceDetailModel;
}

export function RequestServicePageScreen({
  workspace,
}: RequestServicePageScreenProps) {
  return (
    <DashboardShell
      title="Lane brief"
      subtitle="Read the lane brief first, then continue if it matches."
      mobileQuickActions={(
        <RequestServiceDetailMobileActions
          backHref={workspace.backHref}
          continueHref={workspace.continueHref}
        />
      )}
    >
      <div className="space-y-6">
        <RequestServiceDetailPageState workspace={workspace} />
      </div>
    </DashboardShell>
  );
}
