'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type {
  VendorInterviewAnswerInput,
  VendorInterviewQuestion,
  VendorProfile,
} from '@/lib/types';

import {
  buildInterviewHintSummary,
  collectInterviewSignals,
  isDirectUploadUnavailable,
  PROFILE_STALE_MS,
  resolveResumeMimeType,
  resolveVerificationLabel,
  resolveVerificationTone,
  uploadFileToDirectTarget,
  type VendorVerificationFeedbackSummary,
} from './vendor-verification.utils';

type WorkspaceMessage = { tone: 'success' | 'info'; text: string } | null;

export function useVendorVerification() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [headline, setHeadline] = useState('');
  const [resumeHighlights, setResumeHighlights] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<WorkspaceMessage>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSummary, setFeedbackSummary] =
    useState<VendorVerificationFeedbackSummary | null>(null);

  const profile = useQuery({
    queryKey: ['vendor-profile', token],
    queryFn: () => apiClient.getVendorProfile(token ?? ''),
    enabled: Boolean(token),
    staleTime: PROFILE_STALE_MS,
    refetchOnMount: false,
  });

  const capabilities = useQuery({
    queryKey: ['vendor-capability-verification-count', token],
    queryFn: () => apiClient.getVendorServiceCapabilities(token ?? ''),
    enabled: Boolean(token),
    staleTime: PROFILE_STALE_MS,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (!profile.data) {
      return;
    }

    setHeadline(profile.data.professional_headline ?? '');
    setResumeHighlights(profile.data.resume_highlights ?? '');
    setAnswers(
      Object.fromEntries(
        (profile.data.interview_questions ?? []).map((question) => [
          question.id,
          '',
        ]),
      ),
    );
  }, [profile.data]);

  const interviewQuestions = profile.data?.interview_questions ?? [];
  const interviewAttemptHistory = profile.data?.interview_attempt_history ?? [];
  const interviewHintSummary = useMemo(
    () => buildInterviewHintSummary(interviewQuestions),
    [interviewQuestions],
  );
  const commonInterviewSignals = useMemo(
    () => collectInterviewSignals(interviewQuestions),
    [interviewQuestions],
  );
  const latestAttempt = interviewAttemptHistory[0] ?? null;
  const previousAttempt = interviewAttemptHistory[1] ?? null;
  const scoreDelta =
    latestAttempt && previousAttempt
      ? latestAttempt.score - previousAttempt.score
      : null;
  const activeLaneCount = useMemo(
    () =>
      (capabilities.data ?? []).filter((capability) => capability.is_active)
        .length,
    [capabilities.data],
  );
  const verificationTone = resolveVerificationTone(
    profile.data?.verification_status,
    profile.data?.verification_badge_granted,
  );
  const verificationLabel = resolveVerificationLabel(
    profile.data?.verification_status,
    profile.data?.verification_badge_granted,
  );

  const refreshVendorState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['vendor-profile', token] }),
      queryClient.invalidateQueries({
        queryKey: ['vendor-dashboard-summary', token],
      }),
    ]);
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!token || !profile.data) {
        throw new Error('Vendor profile is not ready yet.');
      }

      return apiClient.updateVendorProfile(token, {
        companyName: profile.data.company_name || 'Vendor studio',
        bio: profile.data.bio ?? null,
        website: profile.data.website ?? null,
        portfolioLink: profile.data.portfolio_link ?? null,
        professionalHeadline: headline || null,
        resumeHighlights: resumeHighlights || null,
      });
    },
    onSuccess: async () => {
      setError(null);
      setFeedbackSummary(null);
      setMessage({
        tone: 'success',
        text: 'Verification profile saved. You can upload the resume or regenerate interview questions next.',
      });
      await refreshVendorState();
    },
    onError: (mutationError: Error) => {
      setMessage(null);
      setError(mutationError.message);
    },
  });

  const uploadResume = useMutation({
    mutationFn: async () => {
      if (!token || !resumeFile) {
        throw new Error('Choose a resume file first.');
      }

      const mimeType = resolveResumeMimeType(resumeFile);

      try {
        const prepared = await apiClient.prepareVendorResumeDirectUpload(token, {
          file_name: resumeFile.name,
          mime_type: mimeType,
        });

        await uploadFileToDirectTarget(
          prepared.upload.url,
          prepared.upload.method,
          prepared.upload.headers,
          resumeFile,
        );

        return apiClient.finalizeVendorResumeDirectUpload(token, {
          file_name: prepared.file_name,
          mime_type: prepared.mime_type,
          storage_path: prepared.storage_path,
          upload_token: prepared.finalize.token,
          expires: prepared.finalize.expires,
        });
      } catch (mutationError) {
        if (
          mutationError instanceof Error &&
          isDirectUploadUnavailable(mutationError)
        ) {
          return apiClient.uploadVendorResume(token, resumeFile);
        }

        throw mutationError;
      }
    },
    onSuccess: async (response) => {
      setError(null);
      setFeedbackSummary(null);
      setMessage({ tone: 'success', text: response.message });
      setResumeFile(null);
      await refreshVendorState();
    },
    onError: (mutationError: Error) => {
      setMessage(null);
      setError(mutationError.message);
    },
  });

  const generateInterview = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Vendor session is missing.');
      }

      return apiClient.generateVendorInterview(token);
    },
    onSuccess: async (response) => {
      setError(null);
      setFeedbackSummary(null);
      setMessage({ tone: 'success', text: response.message });
      setAnswers(
        Object.fromEntries(
          (response.questions ?? []).map((question) => [question.id, '']),
        ),
      );
      await refreshVendorState();
    },
    onError: (mutationError: Error) => {
      setMessage(null);
      setError(mutationError.message);
    },
  });

  const submitInterview = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Vendor session is missing.');
      }

      const payload: VendorInterviewAnswerInput[] = interviewQuestions.map(
        (question) => ({
          question_id: question.id,
          answer: answers[question.id] ?? '',
        }),
      );

      return apiClient.submitVendorInterview(token, payload);
    },
    onSuccess: async (response) => {
      setError(null);
      setFeedbackSummary(response.feedback_summary ?? null);
      setMessage({
        tone: response.passed ? 'success' : 'info',
        text: response.message,
      });
      await refreshVendorState();
    },
    onError: (mutationError: Error) => {
      setMessage(null);
      setError(mutationError.message);
    },
  });

  return {
    profile,
    headline,
    resumeHighlights,
    resumeFile,
    answers,
    message,
    error,
    feedbackSummary,
    interviewQuestions,
    interviewAttemptHistory,
    interviewHintSummary,
    commonInterviewSignals,
    latestAttempt,
    scoreDelta,
    activeLaneCount,
    verificationTone,
    verificationLabel,
    actions: {
      setHeadline,
      setResumeHighlights,
      setResumeFile,
      setAnswer: (questionId: string, value: string) =>
        setAnswers((current) => ({ ...current, [questionId]: value })),
      saveProfile: () => saveProfile.mutate(),
      uploadResume: () => uploadResume.mutate(),
      generateInterview: () => generateInterview.mutate(),
      submitInterview: () => submitInterview.mutate(),
    },
    status: {
      isSavingProfile: saveProfile.isPending,
      isUploadingResume: uploadResume.isPending,
      isGeneratingInterview: generateInterview.isPending,
      isSubmittingInterview: submitInterview.isPending,
    },
  };
}

export type VendorVerificationModel = ReturnType<typeof useVendorVerification>;
