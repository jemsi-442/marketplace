'use client';

import { InlineStateNote } from '@/components/ui/inline-state-note';

import { VendorVerificationAttemptHistory } from './vendor-verification-attempt-history';
import { VendorVerificationFeedbackCard } from './vendor-verification-feedback-card';
import type { VendorVerificationFeedbackSummary } from '../vendor-verification.utils';

interface VendorVerificationStatusStackProps {
  error: string | null;
  feedbackSummary: VendorVerificationFeedbackSummary | null;
  interviewAttemptHistory: Array<{
    badge_granted?: boolean;
    note?: string | null;
    passed: boolean;
    score: number;
    submitted_at: string;
  }>;
  message:
    | {
        tone: 'success' | 'info';
        text: string;
      }
    | null;
  scoreDelta: number | null;
}

export function VendorVerificationStatusStack({
  error,
  feedbackSummary,
  interviewAttemptHistory,
  message,
  scoreDelta,
}: VendorVerificationStatusStackProps) {
  return (
    <>
      {message ? (
        <InlineStateNote tone={message.tone} message={message.text} />
      ) : null}
      {error ? (
        <div className="rounded-[18px] border border-[rgba(248,113,113,0.22)] bg-[rgba(254,242,242,0.96)] px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {feedbackSummary ? (
        <VendorVerificationFeedbackCard feedbackSummary={feedbackSummary} />
      ) : null}
      {interviewAttemptHistory.length ? (
        <VendorVerificationAttemptHistory
          attempts={interviewAttemptHistory}
          scoreDelta={scoreDelta}
        />
      ) : null}
    </>
  );
}
