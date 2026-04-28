'use client';

import { ShieldCheck } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';

import type { AdminVerificationDetailModel } from '../use-admin-verification-detail';
import { AdminVerificationDecisionPanel } from './admin-verification-decision-panel';
import { AdminVerificationDetailHero } from './admin-verification-detail-hero';
import { AdminVerificationInterviewReview } from './admin-verification-interview-review';
import { AdminVerificationSupportReferenceCard } from './admin-verification-support-reference-card';

interface AdminVerificationDetailPageStateProps {
  workspace: AdminVerificationDetailModel;
}

function AdminVerificationLoadingState() {
  return (
    <>
      <Skeleton className="h-56 rounded-[30px]" />
      <Skeleton className="h-64 rounded-[30px]" />
      <Skeleton className="h-72 rounded-[30px]" />
    </>
  );
}

function AdminVerificationErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-[18px] border border-[rgba(248,113,113,0.22)] bg-[rgba(254,242,242,0.96)] px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}

export function AdminVerificationDetailPageState({
  workspace,
}: AdminVerificationDetailPageStateProps) {
  if (workspace.queries.verification.isLoading) {
    return <AdminVerificationLoadingState />;
  }

  if (workspace.queries.verification.isError || !workspace.data) {
    return (
      <EmptyState
        icon={<ShieldCheck className="size-5" />}
        title="Vendor verification is not loading"
        description="Refresh and try again in a moment."
      />
    );
  }

  return (
    <>
      <AdminVerificationDetailHero
        data={workspace.data}
        verificationLabel={workspace.verificationLabel ?? 'Not started'}
        verificationTone={workspace.verificationTone ?? 'info'}
      />

      {workspace.message ? (
        <InlineStateNote
          tone={workspace.message.tone}
          message={workspace.message.text}
        />
      ) : null}
      {workspace.error ? (
        <AdminVerificationErrorNotice message={workspace.error} />
      ) : null}
      {workspace.errorRequestId ? (
        <AdminVerificationSupportReferenceCard
          requestId={workspace.errorRequestId}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <AdminVerificationInterviewReview
          attemptDelta={workspace.attemptDelta}
          attemptTrendPoints={workspace.attemptTrendPoints}
          data={workspace.data}
          interviewInsights={workspace.interviewInsights}
        />

        <AdminVerificationDecisionPanel
          canDownloadResume={workspace.data.resume_uploaded}
          isPreparingResumeLink={workspace.queries.resumeLink.isFetching && !workspace.resumeUrl}
          isReviewPending={workspace.status.isReviewPending}
          reviewNote={workspace.reviewNote}
          onDownloadResume={workspace.actions.downloadResume}
          onReviewNoteChange={workspace.actions.setReviewNote}
          onApprove={workspace.actions.approve}
          onRevoke={workspace.actions.revoke}
        />
      </div>
    </>
  );
}
