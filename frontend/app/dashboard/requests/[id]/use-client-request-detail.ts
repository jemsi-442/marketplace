'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getRequestReviewInsight } from '@/lib/services/request-review-insights';

import {
  REQUEST_DETAIL_REFRESH_MS,
  REQUEST_DETAIL_STALE_MS,
} from './request-detail.utils';

export function useClientRequestDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestId = Number(params.id);
  const token = useAuthStore((state) => state.token);
  const [feedback, setFeedback] = useState<string | null>(null);

  const requestQuery = useQuery({
    queryKey: ['client-request-detail', token, requestId],
    queryFn: () => apiClient.getClientRequest(token ?? '', requestId),
    enabled: Boolean(token) && Number.isFinite(requestId),
    staleTime: REQUEST_DETAIL_STALE_MS,
    refetchOnWindowFocus: false,
    refetchInterval: REQUEST_DETAIL_REFRESH_MS,
  });

  const openBookingMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.openClientRequestBooking(token, requestId);
    },
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['client-request-detail', token, requestId],
        }),
        queryClient.invalidateQueries({ queryKey: ['client-requests', token] }),
      ]);
      router.push(`/dashboard/bookings/${response.booking.id}`);
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error ? error.message : 'Unable to open booking',
      );
    },
  });

  const request = requestQuery.data ?? null;
  const canOpenBooking =
    request?.status === 'awaiting_payment' ||
    request?.status === 'funded' ||
    request?.status === 'completed';
  const openBookingLabel =
    request?.status === 'awaiting_payment'
      ? 'Open payment booking'
      : 'Open current booking';
  const laneInsight = getRequestReviewInsight(
    request?.service_type.group_slug,
    request?.service_type.group_title,
  );

  const nextStep = useMemo(() => {
    switch (request?.status) {
      case 'awaiting_payment':
        return laneInsight.nextStepHint;
      case 'funded':
        return 'Payment protection is active. Continue from bookings.';
      case 'completed':
        return 'This request already finished its flow.';
      default:
        return 'Wait for the next admin update on this request.';
    }
  }, [laneInsight.nextStepHint, request?.status]);

  return {
    canOpenBooking,
    feedback,
    laneInsight,
    nextStep,
    openBookingLabel,
    request,
    queries: {
      requestQuery,
    },
    status: {
      isOpeningBooking: openBookingMutation.isPending,
    },
    actions: {
      dismissFeedback: () => setFeedback(null),
      openBooking: () => openBookingMutation.mutate(),
    },
  };
}

export type ClientRequestDetailModel = ReturnType<typeof useClientRequestDetail>;
