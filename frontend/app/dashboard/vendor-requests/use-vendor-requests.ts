'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

import {
  getVendorRequestResultSummary,
  PAGE_SIZE,
  type ProposalView,
  VENDOR_REQUESTS_STALE_MS,
} from './vendor-requests.utils';

export function useVendorRequests() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin =
    roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const [search, setSearch] = useState('');
  const [proposalView, setProposalView] = useState<ProposalView>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isVendor) {
      router.replace(isAdmin ? '/dashboard/admin' : '/dashboard/client');
    }
  }, [isAdmin, isVendor, router, user]);

  const vendorSummary = useQuery({
    queryKey: ['vendor-dashboard-summary', token],
    queryFn: () => apiClient.getVendorDashboardSummary(token ?? ''),
    enabled: Boolean(token) && isVendor,
    staleTime: VENDOR_REQUESTS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const verificationReady = Boolean(
    vendorSummary.data?.verification_badge_granted,
  );

  const requestFeed = useQuery({
    queryKey: ['vendor-request-feed', token, { page, search, proposalView }],
    queryFn: () =>
      apiClient.getVendorRequestFeed(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search,
        view: proposalView,
      }),
    enabled: Boolean(token) && verificationReady,
    staleTime: VENDOR_REQUESTS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const summary = requestFeed.data?.summary ?? {
    total: 0,
    needs_proposal: 0,
    sent: 0,
  };
  const currentPage = requestFeed.data?.page ?? page;
  const totalPages = requestFeed.data?.total_pages ?? 1;
  const requestItems = requestFeed.data?.items ?? [];
  const resultSummary = getVendorRequestResultSummary(proposalView, search);

  return {
    verificationReady,
    search,
    proposalView,
    summary,
    currentPage,
    totalPages,
    requestItems,
    resultSummary,
    queries: {
      vendorSummary,
      requestFeed,
    },
    actions: {
      applyProposalView: (nextView: ProposalView) => {
        setProposalView(nextView);
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

export type VendorRequestsModel = ReturnType<typeof useVendorRequests>;
