'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

import {
  ADMIN_VERIFICATIONS_STALE_MS,
  getVerificationResultSummary,
  PAGE_SIZE,
  type VerificationFilter,
} from './admin-verifications.utils';

export function useAdminVerifications() {
  const token = useAuthStore((state) => state.token);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VerificationFilter>('all');
  const [page, setPage] = useState(1);

  const verificationsQuery = useQuery({
    queryKey: ['admin-vendor-verifications', token, { page, search, filter }],
    queryFn: () =>
      apiClient.getAdminVendorVerifications(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search: search.trim(),
        view: filter,
      }),
    enabled: Boolean(token),
    staleTime: ADMIN_VERIFICATIONS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const summary = verificationsQuery.data?.summary ?? {
    total: 0,
    ready_review: 0,
    badge_active: 0,
    needs_revision: 0,
    missing_resume: 0,
  };
  const items = verificationsQuery.data?.items ?? [];
  const totalPages = verificationsQuery.data?.total_pages ?? 1;
  const currentPage = verificationsQuery.data?.page ?? page;
  const resultSummary = getVerificationResultSummary(filter, search);

  return {
    currentPage,
    filter,
    items,
    resultSummary,
    search,
    summary,
    totalPages,
    queries: {
      verificationsQuery,
    },
    actions: {
      applyFilter: (nextFilter: VerificationFilter) => {
        setFilter(nextFilter);
        setPage(1);
      },
      setSearch: (value: string) => {
        setSearch(value);
        setPage(1);
      },
      goToPreviousPage: () => setPage((value) => Math.max(1, value - 1)),
      goToNextPage: () =>
        setPage((value) => Math.min(totalPages, value + 1)),
    },
  };
}

export type AdminVerificationsModel = ReturnType<typeof useAdminVerifications>;
