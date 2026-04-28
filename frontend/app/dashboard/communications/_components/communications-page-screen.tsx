'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';

import type { CommunicationsModel } from '../use-communications';
import { CommunicationsContent } from './communications-content';
import { CommunicationsMobileActions } from './communications-mobile-actions';

interface CommunicationsPageScreenProps {
  workspace: CommunicationsModel;
}

export function CommunicationsPageScreen({
  workspace,
}: CommunicationsPageScreenProps) {
  return (
    <DashboardShell
      title="Inbox"
      subtitle="Choose a thread, read it here, then reply when needed."
      mobileQuickActions={(
        <CommunicationsMobileActions
          currentWorkspaceHref={workspace.currentWorkspaceHref}
          openPageHref={workspace.selectedThread?.href ?? null}
        />
      )}
    >
      <CommunicationsContent workspace={workspace} />
    </DashboardShell>
  );
}
