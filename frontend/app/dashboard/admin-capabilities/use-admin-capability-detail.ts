'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getAdminLaneReviewGuidance } from '@/lib/services/vendor-capability-review-insights';

import { ADMIN_CAPABILITIES_STALE_MS } from './admin-capabilities.utils';

export function useAdminCapabilityDetail() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const capabilityId = Number(params?.id);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const capability = useQuery({
    queryKey: ['admin-vendor-capability-detail', token, capabilityId],
    queryFn: () => apiClient.getAdminVendorCapability(token ?? '', capabilityId),
    enabled: Boolean(token) && Number.isFinite(capabilityId) && capabilityId > 0,
    staleTime: ADMIN_CAPABILITIES_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const reviewMutation = useMutation({
    mutationFn: async (decision: 'approve' | 'return') => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.reviewAdminVendorCapability(token, capabilityId, {
        decision,
        review_note: reviewNote.trim() || null,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-vendor-capabilities', token] }),
        queryClient.invalidateQueries({ queryKey: ['admin-vendor-capability-detail', token, capabilityId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-shell-summary', token] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-service-capabilities'] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-request-feed'] }),
      ]);
      if (response.capability.admin_review_note) {
        setReviewNote(response.capability.admin_review_note);
      }
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to review this capability right now.');
    },
  });

  const data = capability.data;
  const laneGuidance = getAdminLaneReviewGuidance(
    data?.service_type.group_slug,
    data?.service_type.group_title,
  );

  return {
    capabilityId,
    capability,
    data,
    laneGuidance,
    feedback,
    reviewNote,
    reviewPending: reviewMutation.isPending,
    actions: {
      dismissFeedback: () => setFeedback(null),
      setReviewNote,
      reviewCapability: (decision: 'approve' | 'return') => reviewMutation.mutate(decision),
    },
  };
}

export type AdminCapabilityDetailModel = ReturnType<
  typeof useAdminCapabilityDetail
>;
