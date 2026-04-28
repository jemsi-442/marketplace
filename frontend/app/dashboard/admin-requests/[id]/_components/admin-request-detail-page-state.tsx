'use client';

import { ClipboardList } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

import type { AdminRequestDetailModel } from '../../use-admin-request-detail';
import { AdminRequestClientBriefCard } from './admin-request-client-brief-card';
import { AdminRequestDetailOverviewCard } from './admin-request-detail-overview-card';
import { AdminRequestFinalUpdateCard } from './admin-request-final-update-card';
import { AdminRequestProposalsCard } from './admin-request-proposals-card';

interface AdminRequestDetailPageStateProps {
  workspace: AdminRequestDetailModel;
}

function AdminRequestLoadingCard() {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Card>
  );
}

export function AdminRequestDetailPageState({
  workspace,
}: AdminRequestDetailPageStateProps) {
  if (workspace.requestInterests.isLoading) {
    return <AdminRequestLoadingCard />;
  }

  if (workspace.requestInterests.isError) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-5" />}
        title="This request is not loading right now"
        description="Refresh and try again in a moment."
      />
    );
  }

  if (!workspace.requestInterests.data) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-5" />}
        title="This request is unavailable"
        description="Go back to the request queue and open another request."
      />
    );
  }

  return (
    <>
      <AdminRequestDetailOverviewCard
        interestCount={workspace.requestInterests.data.interests.length}
        laneInsight={workspace.laneInsight}
        request={workspace.requestInterests.data.request}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminRequestClientBriefCard
          request={workspace.requestInterests.data.request}
        />
        <AdminRequestProposalsCard
          interests={workspace.requestInterests.data.interests}
          selectedInterestId={workspace.selectedInterestId}
          onSelectInterest={workspace.actions.selectInterest}
        />
      </div>

      {workspace.requestInterests.data.interests.length ? (
        <AdminRequestFinalUpdateCard
          adminAssignmentNote={workspace.adminAssignmentNote}
          agreedPriceTzs={workspace.agreedPriceTzs}
          agreedTimelineNote={workspace.agreedTimelineNote}
          assignPending={workspace.assignPending}
          laneInsight={workspace.laneInsight}
          selectedInterest={workspace.selectedInterest}
          selectedInterestId={workspace.selectedInterestId}
          onAdminAssignmentNoteChange={workspace.actions.setAdminAssignmentNote}
          onAgreedPriceChange={workspace.actions.setAgreedPrice}
          onAgreedTimelineChange={workspace.actions.setAgreedTimeline}
          onAssignRequest={workspace.actions.assignRequest}
        />
      ) : null}
    </>
  );
}
