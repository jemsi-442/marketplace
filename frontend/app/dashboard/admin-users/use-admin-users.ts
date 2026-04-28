'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

import {
  ADMIN_USERS_STALE_MS,
  PAGE_SIZE,
  type UserFilter,
} from './admin-users.utils';

export function useAdminUsers() {
  const token = useAuthStore((state) => state.token);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [page, setPage] = useState(1);

  const users = useQuery({
    queryKey: ['admin-users', token, search, filter, page],
    queryFn: () =>
      apiClient.getAdminUsers(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search: search.trim(),
        view: filter,
      }),
    enabled: Boolean(token),
    staleTime: ADMIN_USERS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const summary = users.data?.summary ?? {
    total: 0,
    clients: 0,
    vendors: 0,
    admins: 0,
    locked: 0,
    unverified: 0,
  };
  const paginatedUsers = users.data?.items ?? [];
  const totalPages = users.data?.total_pages ?? 1;
  const currentPage = Math.min(page, totalPages);

  return {
    feedback,
    search,
    filter,
    summary,
    paginatedUsers,
    totalPages,
    currentPage,
    queries: {
      users,
    },
    actions: {
      dismissFeedback: () => setFeedback(null),
      setSearch: (value: string) => {
        setSearch(value);
        setPage(1);
      },
      applyFilter: (nextFilter: UserFilter) => {
        setFilter(nextFilter);
        setPage(1);
      },
      goToPreviousPage: () => setPage((value) => Math.max(1, value - 1)),
      goToNextPage: () =>
        setPage((value) => Math.min(totalPages, value + 1)),
    },
  };
}

export type AdminUsersModel = ReturnType<typeof useAdminUsers>;
