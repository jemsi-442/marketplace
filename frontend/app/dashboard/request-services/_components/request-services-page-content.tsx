'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

import { useRequestServices } from '../use-request-services';
import { RequestServicesContent } from './request-services-content';
import { RequestServicesMobileActions } from './request-services-mobile-actions';

export function RequestServicesPageContent() {
  const workspace = useRequestServices();

  return (
    <DashboardShell
      title="Business lanes"
      subtitle="Choose a lane first, then open the exact service."
      mobileQuickActions={<RequestServicesMobileActions />}
    >
      <RequestServicesContent workspace={workspace} />
    </DashboardShell>
  );
}
