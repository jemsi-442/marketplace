'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { resolveServiceGroupSlugFromValue } from '@/lib/services/catalog-groups';

import {
  filterRequestServiceGroups,
  getDensestServiceGroup,
  SERVICE_DISCOVERY_STALE_MS,
} from './request-services.utils';

export function useRequestServices() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin =
    roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const isClient = !isAdmin && !isVendor;
  const [search, setSearch] = useState(searchParams.get('search')?.trim() ?? '');

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isClient) {
      router.replace(
        isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard',
      );
    }
  }, [isAdmin, isClient, isVendor, router, user]);

  const serviceGroupsQuery = useQuery({
    queryKey: ['client-service-groups', token],
    queryFn: () => apiClient.getServiceGroups(token ?? ''),
    enabled: Boolean(token),
    staleTime: SERVICE_DISCOVERY_STALE_MS,
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
      `/dashboard/request-services/category/${slug}?${params.toString()}`,
    );
  }, [categoryParam, router, serviceGroupsQuery.data]);

  const groups = useMemo(
    () => filterRequestServiceGroups(serviceGroupsQuery.data ?? [], search),
    [search, serviceGroupsQuery.data],
  );

  const totalServices = useMemo(
    () =>
      (serviceGroupsQuery.data ?? []).reduce(
        (sum, group) => sum + group.service_count,
        0,
      ),
    [serviceGroupsQuery.data],
  );

  const densestGroup = useMemo(
    () => getDensestServiceGroup(serviceGroupsQuery.data ?? []),
    [serviceGroupsQuery.data],
  );

  return {
    search,
    groups,
    totalServices,
    densestGroup,
    queries: {
      serviceGroupsQuery,
    },
    actions: {
      setSearch,
    },
  };
}

export type RequestServicesModel = ReturnType<typeof useRequestServices>;
