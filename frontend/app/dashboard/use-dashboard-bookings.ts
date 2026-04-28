'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

import {
  BOOKINGS_PAGE_STALE_MS,
  getDashboardHomeHref,
  PAGE_SIZE,
  type DashboardBookingView,
} from './dashboard-bookings.utils';

export function useDashboardBookings() {
  const token = useAuthStore((state) => state.token);
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  const homeHref = getDashboardHomeHref(roles);
  const [view, setView] = useState<DashboardBookingView>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const bookingsQuery = useQuery({
    queryKey: ['dashboard-bookings-page', token, { page, view, search }],
    queryFn: () =>
      apiClient.getBookings(token ?? '', {
        page,
        limit: PAGE_SIZE,
        view,
        search: search.trim(),
      }),
    enabled: Boolean(token),
    staleTime: BOOKINGS_PAGE_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const summary = bookingsQuery.data?.summary ?? {
    total: 0,
    active: 0,
    protected: 0,
    unread: 0,
  };
  const currentPage = bookingsQuery.data?.page ?? page;
  const totalPages = bookingsQuery.data?.total_pages ?? 1;
  const bookingItems = bookingsQuery.data?.items ?? [];

  return {
    bookingItems,
    currentPage,
    homeHref,
    search,
    summary,
    totalPages,
    view,
    queries: {
      bookingsQuery,
    },
    actions: {
      applyView: (nextView: DashboardBookingView) => {
        setView(nextView);
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

export type DashboardBookingsModel = ReturnType<typeof useDashboardBookings>;
