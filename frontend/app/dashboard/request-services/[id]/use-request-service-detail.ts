'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getRequestServiceInsights } from '@/lib/services/request-service-insights';

import { REQUEST_SERVICE_DETAIL_STALE_MS } from './request-service-detail.utils';

export function useRequestServiceDetail() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const serviceTypeId = Number(params.id);
  const token = useAuthStore((state) => state.token);
  const groupSlug = searchParams.get('group')?.trim();
  const backHref = groupSlug
    ? `/dashboard/request-services/category/${groupSlug}`
    : '/dashboard/request-services';
  const continueHref = groupSlug
    ? `/dashboard/request-services/${serviceTypeId}/request?group=${encodeURIComponent(groupSlug)}`
    : `/dashboard/request-services/${serviceTypeId}/request`;

  const serviceTypeQuery = useQuery({
    queryKey: ['request-service-type-detail', token, serviceTypeId],
    queryFn: () => apiClient.getServiceType(serviceTypeId, token ?? ''),
    enabled: Boolean(token) && Number.isFinite(serviceTypeId),
    staleTime: REQUEST_SERVICE_DETAIL_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const insights = serviceTypeQuery.data
    ? getRequestServiceInsights(serviceTypeQuery.data)
    : null;
  const laneLabel =
    serviceTypeQuery.data?.group_title ?? insights?.laneLabel ?? 'Service lane';

  return {
    backHref,
    continueHref,
    insights,
    laneLabel,
    serviceType: serviceTypeQuery.data ?? null,
    queries: {
      serviceTypeQuery,
    },
  };
}

export type RequestServiceDetailModel = ReturnType<typeof useRequestServiceDetail>;
