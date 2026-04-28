'use client';

import { ClipboardList, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

import type { VendorRequestDetailModel } from '../use-vendor-request-detail';
import { VendorRequestDetailsCard } from './vendor-request-details-card';
import { VendorRequestOverviewCard } from './vendor-request-overview-card';
import { VendorRequestProposalCard } from './vendor-request-proposal-card';

interface VendorRequestDetailPageStateProps {
  workspace: VendorRequestDetailModel;
}

function VendorRequestLoadingCard() {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Card>
  );
}

export function VendorRequestDetailPageState({
  workspace,
}: VendorRequestDetailPageStateProps) {
  const verificationDescription = workspace.queries.vendorSummary.data?.resume_uploaded
    ? 'Your resume is ready. Finish the interview and review first.'
    : 'Upload your resume and complete verification first.';

  if (workspace.queries.vendorSummary.isLoading) {
    return <VendorRequestLoadingCard />;
  }

  if (!workspace.verificationReady) {
    return (
      <EmptyState
        icon={<ShieldCheck className="size-5" />}
        title="Finish verification before opening request details"
        description={verificationDescription}
        action={(
          <Link
            href="/dashboard/vendor-verification"
            className="w-full sm:w-auto"
          >
            <Button className="w-full sm:w-auto">
              Continue to verification
            </Button>
          </Link>
        )}
      />
    );
  }

  if (workspace.queries.requestDetail.isLoading) {
    return <VendorRequestLoadingCard />;
  }

  if (workspace.queries.requestDetail.isError) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-5" />}
        title="This request is not loading right now"
        description="Refresh and try again in a moment."
      />
    );
  }

  if (!workspace.request) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-5" />}
        title="This request is not available right now"
        description="Refresh and try again in a moment."
      />
    );
  }

  return (
    <>
      <VendorRequestOverviewCard
        laneLabel={workspace.laneInsight.laneLabel}
        fitSummary={workspace.laneInsight.fitSummary}
        request={workspace.request}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <VendorRequestDetailsCard request={workspace.request} />

        <VendorRequestProposalCard
          adminNoteHint={workspace.laneInsight.adminNoteHint}
          isSubmittingProposal={workspace.status.isSubmittingProposal}
          message={workspace.message}
          priceHint={workspace.laneInsight.priceHint}
          priceReason={workspace.priceReason}
          proposedPriceTzs={workspace.proposedPriceTzs}
          request={workspace.request}
          timelineHint={workspace.laneInsight.timelineHint}
          timelineNote={workspace.timelineNote}
          onMessageChange={workspace.actions.setMessage}
          onPriceReasonChange={workspace.actions.setPriceReason}
          onProposedPriceChange={workspace.actions.setProposedPriceTzs}
          onSubmitProposal={workspace.actions.submitProposal}
          onTimelineNoteChange={workspace.actions.setTimelineNote}
        />
      </div>
    </>
  );
}
