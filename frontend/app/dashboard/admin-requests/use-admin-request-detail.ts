'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getRequestReviewInsight } from '@/lib/services/request-review-insights';
import { extractRequestId } from '@/lib/ui/extract-request-id';

import {
  ADMIN_REQUEST_REFRESH_MS,
  ADMIN_REQUEST_STALE_MS,
  toMinorAmountFromTzsInput,
} from './admin-requests.utils';

export function useAdminRequestDetail() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const requestId = Number(params.id);
  const token = useAuthStore((state) => state.token);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedInterestId, setSelectedInterestId] = useState<number | null>(null);
  const [agreedPriceMinorOverride, setAgreedPriceMinorOverride] = useState<string | null>(null);
  const [agreedTimelineNoteOverride, setAgreedTimelineNoteOverride] = useState<string | null>(null);
  const [adminAssignmentNote, setAdminAssignmentNote] = useState('');
  const feedbackRequestId = extractRequestId(feedback);

  const requestInterests = useQuery({
    queryKey: ['admin-client-request-interests', token, requestId],
    queryFn: () => apiClient.getAdminClientRequestInterests(token ?? '', requestId),
    enabled: Boolean(token) && Number.isFinite(requestId),
    staleTime: ADMIN_REQUEST_STALE_MS,
    refetchOnWindowFocus: false,
    refetchInterval: ADMIN_REQUEST_REFRESH_MS,
  });

  const interests = useMemo(() => requestInterests.data?.interests ?? [], [requestInterests.data?.interests]);
  const selectedInterest = useMemo(() => {
    if (!interests.length) {
      return null;
    }

    const explicitSelection =
      selectedInterestId !== null ? interests.find((interest) => interest.id === selectedInterestId) ?? null : null;

    return explicitSelection ?? interests.find((interest) => interest.status === 'approved') ?? interests[0] ?? null;
  }, [interests, selectedInterestId]);

  const agreedPriceTzs =
    agreedPriceMinorOverride ??
    (typeof selectedInterest?.proposed_price_minor === 'number' && Number.isFinite(selectedInterest.proposed_price_minor)
      ? String(Math.round(selectedInterest.proposed_price_minor / 100))
      : '');
  const agreedTimelineNote = agreedTimelineNoteOverride ?? (selectedInterest?.timeline_note ?? '');
  const laneInsight = getRequestReviewInsight(
    requestInterests.data?.request.service_type.group_slug,
    requestInterests.data?.request.service_type.group_title,
  );

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }
      if (!selectedInterest) {
        throw new Error('Choose one vendor proposal before assigning the request.');
      }

      const priceMinor = toMinorAmountFromTzsInput(agreedPriceTzs);
      if (priceMinor === null) {
        throw new Error('Enter a valid agreed price before sending the update.');
      }
      if (agreedTimelineNote.trim().length < 4) {
        throw new Error('Add the delivery timing you want the client to receive.');
      }

      return apiClient.assignAdminClientRequest(token, requestId, {
        vendor_interest_id: selectedInterest.id,
        agreed_price_minor: priceMinor,
        currency: requestInterests.data?.request.currency ?? 'TZS',
        agreed_timeline_note: agreedTimelineNote.trim(),
        admin_assignment_note: adminAssignmentNote.trim() || null,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-client-requests', token] }),
        queryClient.invalidateQueries({ queryKey: ['admin-client-request-interests', token, requestId] }),
      ]);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to assign this request right now.');
    },
  });

  return {
    requestId,
    requestInterests,
    interests,
    selectedInterest,
    agreedPriceTzs,
    agreedTimelineNote,
    laneInsight,
    feedback,
    feedbackRequestId,
    selectedInterestId,
    adminAssignmentNote,
    assignPending: assignMutation.isPending,
    actions: {
      dismissFeedback: () => setFeedback(null),
      selectInterest: (interestId: number, proposedPriceMinor?: number | null, timelineNote?: string | null) => {
        setSelectedInterestId(interestId);
        setAgreedPriceMinorOverride(
          typeof proposedPriceMinor === 'number' && Number.isFinite(proposedPriceMinor)
            ? String(Math.round(proposedPriceMinor / 100))
            : '',
        );
        setAgreedTimelineNoteOverride(timelineNote ?? '');
      },
      setAgreedPrice: setAgreedPriceMinorOverride,
      setAgreedTimeline: setAgreedTimelineNoteOverride,
      setAdminAssignmentNote,
      assignRequest: () => assignMutation.mutate(),
    },
  };
}

export type AdminRequestDetailModel = ReturnType<typeof useAdminRequestDetail>;
