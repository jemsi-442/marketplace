'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getVendorRequestMatchInsight } from '@/lib/services/vendor-request-match-insights';

import {
  toMinorAmountFromTzsInput,
  VENDOR_REQUEST_REFRESH_MS,
  VENDOR_REQUEST_STALE_MS,
} from './vendor-request-detail.utils';

export function useVendorRequestDetail() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const requestId = Number(params.id);
  const token = useAuthStore((state) => state.token);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [proposedPriceTzs, setProposedPriceTzs] = useState('');
  const [priceReason, setPriceReason] = useState('');
  const [timelineNote, setTimelineNote] = useState('');
  const [message, setMessage] = useState('');

  const vendorSummary = useQuery({
    queryKey: ['vendor-dashboard-summary', token],
    queryFn: () => apiClient.getVendorDashboardSummary(token ?? ''),
    enabled: Boolean(token),
    staleTime: VENDOR_REQUEST_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const verificationReady = Boolean(
    vendorSummary.data?.verification_badge_granted,
  );

  const requestDetail = useQuery({
    queryKey: ['vendor-request-detail', token, requestId],
    queryFn: () => apiClient.getVendorRequestDetail(token ?? '', requestId),
    enabled: Boolean(token) && verificationReady,
    staleTime: VENDOR_REQUEST_STALE_MS,
    refetchOnWindowFocus: false,
    refetchInterval: VENDOR_REQUEST_REFRESH_MS,
  });

  const request = requestDetail.data ?? null;
  const laneInsight = getVendorRequestMatchInsight(
    request?.service_type.group_slug,
    request?.service_type.group_title,
  );

  const proposalMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const trimmedReason = priceReason.trim();
      const trimmedTimeline = timelineNote.trim();
      const parsedPriceMinor = toMinorAmountFromTzsInput(proposedPriceTzs);

      if (parsedPriceMinor === null) {
        throw new Error('Enter a valid price before you send the proposal.');
      }
      if (trimmedReason.length < 12) {
        throw new Error(
          'Explain the price clearly so admin can compare you fairly.',
        );
      }
      if (trimmedTimeline.length < 4) {
        throw new Error('Add the time you need to complete this work.');
      }

      return apiClient.submitVendorRequestInterest(token, requestId, {
        proposed_price_minor: parsedPriceMinor,
        price_reason: trimmedReason,
        timeline_note: trimmedTimeline,
        message: message.trim() || null,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vendor-request-feed', token] }),
        queryClient.invalidateQueries({
          queryKey: ['vendor-request-detail', token, requestId],
        }),
      ]);
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Unable to send proposal right now.',
      );
    },
  });

  return {
    requestId,
    feedback,
    proposedPriceTzs,
    priceReason,
    timelineNote,
    message,
    verificationReady,
    request,
    laneInsight,
    queries: {
      vendorSummary,
      requestDetail,
    },
    status: {
      isSubmittingProposal: proposalMutation.isPending,
    },
    actions: {
      dismissFeedback: () => setFeedback(null),
      setProposedPriceTzs,
      setPriceReason,
      setTimelineNote,
      setMessage,
      submitProposal: () => proposalMutation.mutate(),
    },
  };
}

export type VendorRequestDetailModel = ReturnType<typeof useVendorRequestDetail>;
