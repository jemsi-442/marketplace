'use client';

import { BriefcaseBusiness } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

import type { AdminCapabilityDetailModel } from '../../use-admin-capability-detail';
import { AdminCapabilityDetailHero } from './admin-capability-detail-hero';
import { AdminCapabilityDetailsCard } from './admin-capability-details-card';
import { AdminCapabilityGuidanceGrid } from './admin-capability-guidance-grid';
import { AdminCapabilityReviewDecisionCard } from './admin-capability-review-decision-card';

interface AdminCapabilityDetailPageStateProps {
  workspace: AdminCapabilityDetailModel;
}

export function AdminCapabilityDetailPageState({
  workspace,
}: AdminCapabilityDetailPageStateProps) {
  if (workspace.capability.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-72 rounded-[28px]" />
      </div>
    );
  }

  if (workspace.capability.isError || !workspace.data) {
    return (
      <EmptyState
        icon={<BriefcaseBusiness className="size-5" />}
        title="Capability review is not loading"
        description="Go back to the capability list and try again."
        action={(
          <Link href="/dashboard/admin-capabilities">
            <Button>Open capability lanes</Button>
          </Link>
        )}
      />
    );
  }

  return (
    <>
      <AdminCapabilityDetailHero
        capability={workspace.data}
        laneGuidance={workspace.laneGuidance}
      />

      <AdminCapabilityGuidanceGrid laneGuidance={workspace.laneGuidance} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <AdminCapabilityDetailsCard capability={workspace.data} />
        <AdminCapabilityReviewDecisionCard
          decisionCopy={workspace.laneGuidance.decisionCopy}
          isPending={workspace.reviewPending}
          notePlaceholder={workspace.laneGuidance.notePlaceholder}
          reviewNote={workspace.reviewNote}
          onReviewNoteChange={workspace.actions.setReviewNote}
          onApprove={() => workspace.actions.reviewCapability('approve')}
          onReturn={() => workspace.actions.reviewCapability('return')}
        />
      </div>
    </>
  );
}
