'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

import {
  type AdminRequestStatusView,
  getRequestListSummary,
  PAGE_SIZE,
} from './admin-requests.utils';

export function useAdminRequests() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const [search, setSearch] = useState('');
  const [statusView, setStatusView] = useState<AdminRequestStatusView>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, router, user]);

  const requests = useQuery({
    queryKey: ['admin-client-requests', token, { page, search, statusView }],
    queryFn: () =>
      apiClient.getAdminClientRequests(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search,
        view: statusView,
      }),
    enabled: Boolean(token) && isAdmin,
  });

  const summary = requests.data?.summary ?? {
    total: 0,
    open: 0,
    needs_review: 0,
    awaiting_payment: 0,
  };
  const currentPage = requests.data?.page ?? page;
  const totalPages = requests.data?.total_pages ?? 1;
  const requestItems = requests.data?.items ?? [];
  const resultSummary = getRequestListSummary(statusView, search);

  return {
    requests,
    summary,
    currentPage,
    totalPages,
    requestItems,
    search,
    statusView,
    resultSummary,
    actions: {
      setSearch: (value: string) => {
        setSearch(value);
        setPage(1);
      },
      applyStatusView: (nextView: AdminRequestStatusView) => {
        setStatusView(nextView);
        setPage(1);
      },
      goToPreviousPage: () => setPage((value) => Math.max(1, value - 1)),
      goToNextPage: () => setPage((value) => Math.min(totalPages, value + 1)),
    },
  };
}

export type AdminRequestsModel = ReturnType<typeof useAdminRequests>;
