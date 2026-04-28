'use client';

import { ClipboardList } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

import type { RequestServiceDetailModel } from '../use-request-service-detail';
import { RequestServiceCommercialRhythmCard } from './request-service-commercial-rhythm-card';
import { RequestServiceDetailHero } from './request-service-detail-hero';
import { RequestServicePlatformPromiseCard } from './request-service-platform-promise-card';
import { RequestServiceProcessCard } from './request-service-process-card';
import { RequestServiceReadinessCard } from './request-service-readiness-card';

interface RequestServiceDetailPageStateProps {
  workspace: RequestServiceDetailModel;
}

function RequestServiceDetailLoadingCard() {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Card>
  );
}

export function RequestServiceDetailPageState({
  workspace,
}: RequestServiceDetailPageStateProps) {
  if (workspace.queries.serviceTypeQuery.isLoading) {
    return <RequestServiceDetailLoadingCard />;
  }

  if (workspace.queries.serviceTypeQuery.isError) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-5" />}
        title="This lane brief is not loading right now"
        description="Refresh and try again in a moment."
      />
    );
  }

  if (!workspace.serviceType || !workspace.insights) {
    return null;
  }

  return (
    <>
      <RequestServiceDetailHero
        backHref={workspace.backHref}
        continueHref={workspace.continueHref}
        laneLabel={workspace.laneLabel}
        insights={workspace.insights}
        serviceType={workspace.serviceType}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <RequestServiceProcessCard insights={workspace.insights} />

        <div className="grid gap-6">
          <RequestServiceReadinessCard
            insights={workspace.insights}
            serviceType={workspace.serviceType}
          />
          <RequestServicePlatformPromiseCard
            continueHref={workspace.continueHref}
          />
        </div>
      </div>

      <RequestServiceCommercialRhythmCard />
    </>
  );
}
