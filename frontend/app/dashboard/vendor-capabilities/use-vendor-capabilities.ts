'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { resolveServiceGroupSlugFromValue } from '@/lib/services/catalog-groups';

import {
  buildMetricsByGroup,
  CAPABILITY_PAGE_STALE_MS,
  filterServiceGroups,
  getDensestGroup,
} from './vendor-capabilities.utils';

export function useVendorCapabilities() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin =
    roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const [search, setSearch] = useState(searchParams.get('search')?.trim() ?? '');

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isVendor) {
      router.replace(isAdmin ? '/dashboard/admin' : '/dashboard/client');
    }
  }, [isAdmin, isVendor, router, user]);

  const serviceGroupsQuery = useQuery({
    queryKey: ['vendor-capability-groups', token],
    queryFn: () => apiClient.getServiceGroups(token ?? ''),
    enabled: Boolean(token) && isVendor,
    staleTime: CAPABILITY_PAGE_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const serviceTypesQuery = useQuery({
    queryKey: ['vendor-capability-service-types', token],
    queryFn: () => apiClient.getServiceTypes(token ?? ''),
    enabled: Boolean(token) && isVendor,
    staleTime: CAPABILITY_PAGE_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const capabilitiesQuery = useQuery({
    queryKey: ['vendor-service-capabilities', token],
    queryFn: () => apiClient.getVendorServiceCapabilities(token ?? ''),
    enabled: Boolean(token) && isVendor,
    staleTime: CAPABILITY_PAGE_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const categoryParam = searchParams.get('category')?.trim() ?? '';

  useEffect(() => {
    if (!categoryParam || !serviceGroupsQuery.data) {
      return;
    }

    const slug = resolveServiceGroupSlugFromValue(
      serviceGroupsQuery.data,
      categoryParam,
    );

    if (!slug) {
      return;
    }

    const params = new URLSearchParams();
    params.set('search', categoryParam);
    router.replace(
      `/dashboard/vendor-capabilities/category/${slug}?${params.toString()}`,
    );
  }, [categoryParam, router, serviceGroupsQuery.data]);

  const metricsByGroup = useMemo(
    () =>
      buildMetricsByGroup(
        capabilitiesQuery.data ?? [],
        serviceTypesQuery.data ?? [],
        serviceGroupsQuery.data ?? [],
      ),
    [capabilitiesQuery.data, serviceGroupsQuery.data, serviceTypesQuery.data],
  );

  const groups = useMemo(
    () => filterServiceGroups(serviceGroupsQuery.data ?? [], search),
    [search, serviceGroupsQuery.data],
  );

  const totalActiveCapabilities = useMemo(
    () =>
      Array.from(metricsByGroup.values()).reduce(
        (sum, bucket) => sum + bucket.active,
        0,
      ),
    [metricsByGroup],
  );

  const reviewPressure = useMemo(
    () =>
      Array.from(metricsByGroup.values()).reduce(
        (sum, bucket) => sum + bucket.pending + bucket.returned,
        0,
      ),
    [metricsByGroup],
  );

  const densestGroup = useMemo(
    () => getDensestGroup(serviceGroupsQuery.data ?? []),
    [serviceGroupsQuery.data],
  );

  return {
    search,
    groups,
    metricsByGroup,
    totalActiveCapabilities,
    reviewPressure,
    densestGroup,
    queries: {
      serviceGroupsQuery,
      serviceTypesQuery,
      capabilitiesQuery,
    },
    state: {
      isLoading:
        serviceGroupsQuery.isLoading ||
        serviceTypesQuery.isLoading ||
        capabilitiesQuery.isLoading,
      isError:
        serviceGroupsQuery.isError ||
        serviceTypesQuery.isError ||
        capabilitiesQuery.isError,
    },
    actions: {
      setSearch,
    },
  };
}

export type VendorCapabilitiesModel = ReturnType<typeof useVendorCapabilities>;
