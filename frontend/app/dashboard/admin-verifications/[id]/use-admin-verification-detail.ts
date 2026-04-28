'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { buildVendorVerificationInsightSummary } from '@/lib/services/vendor-verification-insights';
import { extractRequestId } from '@/lib/ui/extract-request-id';
import { isSignedLinkExpiringSoon } from '@/lib/ui/signed-link';
import { parseTimestamp } from '@/components/dashboard/chart-utils';

import {
  formatAttemptLabel,
  getVerificationLabel,
  getVerificationTone,
  normalizeDownloadUrl,
  STALE_MS,
} from './admin-verification-detail.utils';

export function useAdminVerificationDetail() {
  const params = useParams<{ id: string }>();
  const profileId = Number(params.id);
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [reviewNote, setReviewNote] = useState('');
  const [message, setMessage] = useState<{
    tone: 'success' | 'info';
    text: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verification = useQuery({
    queryKey: ['admin-vendor-verification', token, profileId],
    queryFn: () => apiClient.getAdminVendorVerification(token ?? '', profileId),
    enabled: Boolean(token) && Number.isFinite(profileId),
    staleTime: STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const resumeLink = useQuery({
    queryKey: ['admin-vendor-verification-resume-link', token, profileId],
    queryFn: () =>
      apiClient.getAdminVendorVerificationResumeLink(token ?? '', profileId),
    enabled:
      Boolean(token) &&
      Number.isFinite(profileId) &&
      Boolean(verification.data?.resume_uploaded),
    staleTime: 240_000,
    refetchOnWindowFocus: false,
  });

  const reviewMutation = useMutation({
    mutationFn: (decision: 'approve' | 'revoke') =>
      apiClient.reviewAdminVendorVerification(token ?? '', profileId, {
        decision,
        review_note: reviewNote || null,
      }),
    onSuccess: async (response) => {
      setError(null);
      setMessage({
        tone: response.profile.verification_badge_granted ? 'success' : 'info',
        text: response.message,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin-vendor-verification', token, profileId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin-vendor-verifications'],
        }),
      ]);
    },
    onError: (mutationError: Error) => {
      setMessage(null);
      setError(mutationError.message);
    },
  });

  const data = verification.data;
  const errorRequestId = extractRequestId(error);
  const resumeUrl = useMemo(
    () => normalizeDownloadUrl(resumeLink.data?.url),
    [resumeLink.data?.url],
  );
  const interviewInsights = useMemo(
    () => (data ? buildVendorVerificationInsightSummary(data) : null),
    [data],
  );
  const latestAttempt = data?.interview_attempt_history?.[0] ?? null;
  const previousAttempt = data?.interview_attempt_history?.[1] ?? null;
  const attemptDelta =
    latestAttempt && previousAttempt
      ? latestAttempt.score - previousAttempt.score
      : null;
  const attemptTrendPoints = useMemo(
    () =>
      (data?.interview_attempt_history ?? [])
        .slice()
        .reverse()
        .map((attempt, index) => ({
          label: formatAttemptLabel(attempt.submitted_at, index),
          value: attempt.score,
          timestamp: parseTimestamp(attempt.submitted_at),
        })),
    [data?.interview_attempt_history],
  );
  const verificationLabel = data
    ? getVerificationLabel(data.verification_status, data.verification_badge_granted)
    : null;
  const verificationTone = data
    ? getVerificationTone(data.verification_status, data.verification_badge_granted)
    : null;

  const handleResumeDownload = async () => {
    if (!token || !data?.resume_uploaded) {
      return;
    }

    setError(null);

    if (resumeUrl && !isSignedLinkExpiringSoon(resumeUrl)) {
      window.location.assign(resumeUrl);
      return;
    }

    try {
      const refreshed = await resumeLink.refetch();
      const nextUrl = normalizeDownloadUrl(refreshed.data?.url);

      if (!nextUrl) {
        throw new Error('Signed download link is not ready yet.');
      }

      window.location.assign(nextUrl);
    } catch (refreshError) {
      setMessage(null);
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Unable to prepare a fresh resume link right now.',
      );
    }
  };

  return {
    data,
    error,
    errorRequestId,
    interviewInsights,
    message,
    profileId,
    resumeUrl,
    reviewNote,
    attemptDelta,
    attemptTrendPoints,
    verificationLabel,
    verificationTone,
    queries: {
      verification,
      resumeLink,
    },
    status: {
      isReviewPending: reviewMutation.isPending,
    },
    actions: {
      setReviewNote,
      approve: () => reviewMutation.mutate('approve'),
      revoke: () => reviewMutation.mutate('revoke'),
      downloadResume: () => void handleResumeDownload(),
    },
  };
}

export type AdminVerificationDetailModel = ReturnType<
  typeof useAdminVerificationDetail
>;
