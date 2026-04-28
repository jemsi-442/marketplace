'use client';

import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

import type { AdminUserCreateModel } from '../use-admin-user-create';
import { AdminUserCreateFormCard } from './admin-user-create-form-card';
import { AdminUserCreateNextStepCard } from './admin-user-create-next-step-card';

interface AdminUserCreateContentProps {
  workspace: AdminUserCreateModel;
}

export function AdminUserCreateContent({
  workspace,
}: AdminUserCreateContentProps) {
  return (
    <div className="space-y-6">
      {workspace.feedback ? (
        <FeedbackBanner
          message={workspace.feedback}
          tone={inferFeedbackTone(workspace.feedback)}
          onDismiss={workspace.actions.dismissFeedback}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminUserCreateFormCard
          accountOptions={workspace.accountOptions}
          form={workspace.form}
          isCreating={workspace.status.isCreating}
          onEmailChange={workspace.actions.setEmail}
          onPasswordChange={workspace.actions.setPassword}
          onAccountTypeChange={workspace.actions.setAccountType}
          onVerifiedChange={workspace.actions.setIsVerified}
          onLockedChange={workspace.actions.setIsLocked}
          onCreateUser={workspace.actions.createUser}
        />

        <AdminUserCreateNextStepCard />
      </div>
    </div>
  );
}
