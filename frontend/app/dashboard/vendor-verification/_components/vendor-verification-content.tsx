'use client';

import type { VendorVerificationModel } from '../use-vendor-verification';
import { VendorVerificationHero } from './vendor-verification-hero';
import { VendorVerificationInterviewCard } from './vendor-verification-interview-card';
import { VendorVerificationPageState } from './vendor-verification-page-state';
import { VendorVerificationProofSection } from './vendor-verification-proof-section';
import { VendorVerificationStatusStack } from './vendor-verification-status-stack';

interface VendorVerificationContentProps {
  workspace: VendorVerificationModel;
}

export function VendorVerificationContent({
  workspace,
}: VendorVerificationContentProps) {
  if (
    workspace.profile.isLoading ||
    workspace.profile.isError ||
    !workspace.profile.data?.exists
  ) {
    return (
      <VendorVerificationPageState
        hasProfile={Boolean(workspace.profile.data?.exists)}
        isError={workspace.profile.isError}
        isLoading={workspace.profile.isLoading}
      />
    );
  }

  return (
    <>
      <VendorVerificationHero
        activeLaneCount={workspace.activeLaneCount}
        profile={workspace.profile.data}
        verificationLabel={workspace.verificationLabel}
        verificationTone={workspace.verificationTone}
      />

      <VendorVerificationStatusStack
        error={workspace.error}
        feedbackSummary={workspace.feedbackSummary}
        interviewAttemptHistory={workspace.interviewAttemptHistory}
        message={workspace.message}
        scoreDelta={workspace.scoreDelta}
      />

      <VendorVerificationProofSection
        headline={workspace.headline}
        resumeHighlights={workspace.resumeHighlights}
        resumeFile={workspace.resumeFile}
        profile={workspace.profile.data}
        isSavingProfile={workspace.status.isSavingProfile}
        isUploadingResume={workspace.status.isUploadingResume}
        onHeadlineChange={workspace.actions.setHeadline}
        onResumeHighlightsChange={workspace.actions.setResumeHighlights}
        onResumeFileChange={workspace.actions.setResumeFile}
        onSaveProfile={workspace.actions.saveProfile}
        onUploadResume={workspace.actions.uploadResume}
      />

      <VendorVerificationInterviewCard
        answers={workspace.answers}
        badgeGranted={workspace.profile.data.verification_badge_granted}
        commonInterviewSignals={workspace.commonInterviewSignals}
        interviewHintSummary={workspace.interviewHintSummary}
        interviewQuestions={workspace.interviewQuestions}
        isGeneratingInterview={workspace.status.isGeneratingInterview}
        isSubmittingInterview={workspace.status.isSubmittingInterview}
        onAnswerChange={workspace.actions.setAnswer}
        onGenerateInterview={workspace.actions.generateInterview}
        onSubmitInterview={workspace.actions.submitInterview}
      />
    </>
  );
}
