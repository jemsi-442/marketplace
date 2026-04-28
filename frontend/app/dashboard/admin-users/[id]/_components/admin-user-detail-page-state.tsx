'use client';

import { Users } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

import type { AdminUserDetailModel } from '../use-admin-user-detail';
import { AdminUserDetailActionsCard } from './admin-user-detail-actions-card';
import { AdminUserDetailFormCard } from './admin-user-detail-form-card';
import { AdminUserDetailSummaryCard } from './admin-user-detail-summary-card';

interface AdminUserDetailPageStateProps {
  workspace: AdminUserDetailModel;
}

function AdminUserDetailLoadingCard() {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Card>
  );
}

export function AdminUserDetailPageState({
  workspace,
}: AdminUserDetailPageStateProps) {
  if (workspace.queries.userQuery.isLoading) {
    return <AdminUserDetailLoadingCard />;
  }

  if (workspace.queries.userQuery.isError || !workspace.user) {
    return (
      <EmptyState
        icon={<Users className="size-5" />}
        title="This user is not loading right now"
        description="Go back to the user list and try again."
      />
    );
  }

  return (
    <>
      <AdminUserDetailSummaryCard user={workspace.user} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminUserDetailFormCard
          activeForm={workspace.activeForm}
          accountOptions={workspace.accountOptions}
          isUpdating={workspace.status.isUpdating}
          onEmailChange={workspace.actions.setEmail}
          onPasswordChange={workspace.actions.setPassword}
          onAccountTypeChange={workspace.actions.setAccountType}
          onVerifiedChange={workspace.actions.setIsVerified}
          onLockedChange={workspace.actions.setIsLocked}
          onUpdateUser={workspace.actions.updateUser}
        />

        <AdminUserDetailActionsCard
          isDeleting={workspace.status.isDeleting}
          isTogglingLock={workspace.status.isTogglingLock}
          user={workspace.user}
          onDeleteUser={workspace.actions.deleteUser}
          onToggleLock={workspace.actions.toggleLock}
        />
      </div>
    </>
  );
}
