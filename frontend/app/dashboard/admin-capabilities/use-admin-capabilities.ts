'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

import {
  ADMIN_CAPABILITIES_STALE_MS,
  type CapabilityFilter,
  groupCapabilitiesByLane,
  PAGE_SIZE,
} from './admin-capabilities.utils';

export function useAdminCapabilities() {
  const token = useAuthStore((state) => state.token);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CapabilityFilter>('all');
  const [page, setPage] = useState(1);

  const capabilities = useQuery({
    queryKey: ['admin-vendor-capabilities', token, { page, search, filter }],
    queryFn: () =>
      apiClient.getAdminVendorCapabilities(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search: search.trim(),
        view: filter,
      }),
    enabled: Boolean(token),
    staleTime: ADMIN_CAPABILITIES_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const summary = capabilities.data?.summary ?? {
    total: 0,
    pending: 0,
    approved: 0,
    returned: 0,
  };
  const items = capabilities.data?.items ?? [];
  const totalPages = capabilities.data?.total_pages ?? 1;
  const currentPage = Math.min(page, totalPages);
  const groupedItems = groupCapabilitiesByLane(items);
  const visibleLaneCount = groupedItems.length;

  return {
    capabilities,
    search,
    filter,
    summary,
    items,
    groupedItems,
    totalPages,
    currentPage,
    visibleLaneCount,
    actions: {
      setSearch: (value: string) => {
        setSearch(value);
        setPage(1);
      },
      applyFilter: (nextFilter: CapabilityFilter) => {
        setFilter(nextFilter);
        setPage(1);
      },
      goToPreviousPage: () => setPage((value) => Math.max(1, value - 1)),
      goToNextPage: () => setPage((value) => Math.min(totalPages, value + 1)),
    },
  };
}

export type AdminCapabilitiesModel = ReturnType<typeof useAdminCapabilities>;
