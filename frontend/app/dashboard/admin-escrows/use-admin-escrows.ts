'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

import {
  ADMIN_ESCROWS_STALE_MS,
  PAGE_SIZE,
  parseAdminEscrowTags,
  type PendingEscrowAction,
} from './admin-escrows.utils';

export function useAdminEscrows() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [resolutionNotes, setResolutionNotes] = useState<Record<number, string>>({});
  const [evidenceSummaries, setEvidenceSummaries] = useState<Record<number, string>>({});
  const [tagInputs, setTagInputs] = useState<Record<number, string>>({});
  const [pendingActions, setPendingActions] = useState<Record<number, PendingEscrowAction>>({});

  const escrows = useQuery({
    queryKey: ['admin-escrow-list', token, { page, search }],
    queryFn: () =>
      apiClient.getDisputedEscrows(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search: search.trim(),
      }),
    enabled: Boolean(token),
    staleTime: ADMIN_ESCROWS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const resolveEscrow = useMutation({
    mutationFn: async ({
      escrowId,
      releaseToVendor,
      resolutionNote,
      evidenceSummary,
      tags,
    }: {
      escrowId: number;
      releaseToVendor: boolean;
      resolutionNote?: string;
      evidenceSummary?: string;
      tags?: string[];
    }) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.resolveEscrow(token, escrowId, {
        release_to_vendor: releaseToVendor,
        resolution_note: resolutionNote?.trim() ? resolutionNote.trim() : null,
        evidence_summary: evidenceSummary?.trim() ? evidenceSummary.trim() : null,
        tags: tags?.length ? tags : undefined,
      });
    },
    onMutate: async ({ escrowId, releaseToVendor }) => {
      setPendingActions((current) => ({
        ...current,
        [escrowId]: releaseToVendor ? 'release' : 'refund',
      }));
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setResolutionNotes((current) => ({ ...current, [response.escrow.id]: '' }));
      setEvidenceSummaries((current) => ({ ...current, [response.escrow.id]: '' }));
      setTagInputs((current) => ({ ...current, [response.escrow.id]: '' }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-escrow-list', token] }),
        queryClient.invalidateQueries({ queryKey: ['admin-escrow-summary', token] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-shell-summary', token] }),
        queryClient.invalidateQueries({ queryKey: ['booking-summary', token] }),
      ]);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to resolve dispute');
    },
    onSettled: (_data, _error, variables) => {
      setPendingActions((current) => {
        const next = { ...current };
        delete next[variables.escrowId];
        return next;
      });
    },
  });

  const items = escrows.data?.items ?? [];
  const totalPages = escrows.data?.total_pages ?? 1;
  const currentPage = escrows.data?.page ?? page;
  const summary = escrows.data?.summary ?? { disputed: 0 };

  return {
    escrows,
    items,
    totalPages,
    currentPage,
    summary,
    feedback,
    search,
    state: {
      resolutionNotes,
      evidenceSummaries,
      tagInputs,
      pendingActions,
    },
    actions: {
      dismissFeedback: () => setFeedback(null),
      setSearch: (value: string) => {
        setSearch(value);
        setPage(1);
      },
      goToPreviousPage: () => setPage((value) => Math.max(1, value - 1)),
      goToNextPage: () => setPage((value) => Math.min(totalPages, value + 1)),
      setResolutionNote: (escrowId: number, value: string) => {
        setResolutionNotes((current) => ({ ...current, [escrowId]: value }));
      },
      setEvidenceSummary: (escrowId: number, value: string) => {
        setEvidenceSummaries((current) => ({ ...current, [escrowId]: value }));
      },
      setTagInput: (escrowId: number, value: string) => {
        setTagInputs((current) => ({ ...current, [escrowId]: value }));
      },
      resolveEscrow: (escrowId: number, releaseToVendor: boolean) => {
        resolveEscrow.mutate({
          escrowId,
          releaseToVendor,
          resolutionNote: resolutionNotes[escrowId] ?? '',
          evidenceSummary: evidenceSummaries[escrowId] ?? '',
          tags: parseAdminEscrowTags(tagInputs[escrowId] ?? ''),
        });
      },
    },
  };
}

export type AdminEscrowsModel = ReturnType<typeof useAdminEscrows>;
