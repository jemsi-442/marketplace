'use client';

import { ClipboardList } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

import type { ClientRequestDetailModel } from '../use-client-request-detail';
import { ClientRequestAdminUpdateCard } from './client-request-admin-update-card';
import { ClientRequestDetailsCard } from './client-request-details-card';
import { ClientRequestOverviewCard } from './client-request-overview-card';

interface ClientRequestDetailPageStateProps {
  workspace: ClientRequestDetailModel;
}

function ClientRequestLoadingCard() {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Card>
  );
}

export function ClientRequestDetailPageState({
  workspace,
}: ClientRequestDetailPageStateProps) {
  if (workspace.queries.requestQuery.isLoading) {
    return <ClientRequestLoadingCard />;
  }

  if (workspace.queries.requestQuery.isError) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-5" />}
        title="This request is not loading right now"
        description="Refresh and try again in a moment."
      />
    );
  }

  if (!workspace.request) {
    return null;
  }

  return (
    <>
      <ClientRequestOverviewCard
        laneInsight={workspace.laneInsight}
        request={workspace.request}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ClientRequestDetailsCard request={workspace.request} />
        <ClientRequestAdminUpdateCard
          canOpenBooking={workspace.canOpenBooking}
          isOpeningBooking={workspace.status.isOpeningBooking}
          nextStep={workspace.nextStep}
          openBookingLabel={workspace.openBookingLabel}
          request={workspace.request}
          onOpenBooking={workspace.actions.openBooking}
        />
      </div>
    </>
  );
}
