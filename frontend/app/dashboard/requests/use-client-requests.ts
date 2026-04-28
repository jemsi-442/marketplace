'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

import {
  PAGE_SIZE,
  type ClientRequestStatusView,
} from './requests.utils';

export function useClientRequests() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin =
    roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const isClient = !isAdmin && !isVendor;
  const [statusView, setStatusView] =
    useState<ClientRequestStatusView>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isClient) {
      router.replace(
        isAdmin
          ? '/dashboard/admin'
          : isVendor
            ? '/dashboard/vendor'
            : '/dashboard',
      );
    }
  }, [isAdmin, isClient, isVendor, router, user]);

  const requestsQuery = useQuery({
    queryKey: ['client-requests', token, { page, statusView }],
    queryFn: () =>
      apiClient.getClientRequests(token ?? '', {
        page,
        limit: PAGE_SIZE,
        view: statusView,
      }),
    enabled: Boolean(token),
  });

  const summary = requestsQuery.data?.summary ?? {
    total: 0,
    active: 0,
    awaiting_payment: 0,
    completed: 0,
  };
  const currentPage = requestsQuery.data?.page ?? page;
  const totalPages = requestsQuery.data?.total_pages ?? 1;
  const requestItems = requestsQuery.data?.items ?? [];

  return {
    currentPage,
    requestItems,
    statusView,
    summary,
    totalPages,
    queries: {
      requestsQuery,
    },
    actions: {
      applyStatusView: (nextView: ClientRequestStatusView) => {
        setStatusView(nextView);
        setPage(1);
      },
      goToPreviousPage: () => setPage((value) => Math.max(1, value - 1)),
      goToNextPage: () =>
        setPage((value) => Math.min(totalPages, value + 1)),
    },
  };
}

export type ClientRequestsModel = ReturnType<typeof useClientRequests>;
