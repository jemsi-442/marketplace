'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type { MessageRecord, ThreadSummaryRecord } from '@/lib/types';

import {
  buildThreadKey,
  PAGE_SIZE,
  resolveSelectedThread,
  THREAD_REFRESH_MS,
  THREAD_STALE_MS,
  type ThreadFilter,
} from './communications.utils';

export function useCommunications() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>('all');
  const [requestedThreadKey, setRequestedThreadKey] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [page, setPage] = useState(1);

  const threadSummaries = useQuery({
    queryKey: ['message-thread-summaries', token, { page, search, threadFilter }],
    queryFn: () =>
      apiClient.getThreadSummaries(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search,
        view: threadFilter,
      }),
    enabled: Boolean(token),
    staleTime: THREAD_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const summary = threadSummaries.data?.summary ?? {
    total: 0,
    requests: 0,
    bookings: 0,
    unread: 0,
  };
  const currentPage = threadSummaries.data?.page ?? page;
  const totalPages = threadSummaries.data?.total_pages ?? 1;
  const paginatedThreadItems = useMemo(() => threadSummaries.data?.items ?? [], [threadSummaries.data?.items]);
  const selectedThreadKey = useMemo(
    () => resolveSelectedThread(paginatedThreadItems, requestedThreadKey),
    [paginatedThreadItems, requestedThreadKey],
  );

  const selectedThread = useMemo<ThreadSummaryRecord | null>(
    () => paginatedThreadItems.find((item) => buildThreadKey(item.kind, item.id) === selectedThreadKey) ?? null,
    [paginatedThreadItems, selectedThreadKey],
  );

  const threadMessages = useQuery({
    queryKey: ['communications-thread', token, selectedThread?.kind, selectedThread?.id],
    queryFn: async () => {
      if (!token || !selectedThread) {
        return [] as MessageRecord[];
      }

      return selectedThread.kind === 'request'
        ? apiClient.getRequestThread(token, selectedThread.id)
        : apiClient.getBookingThread(token, selectedThread.id);
    },
    enabled: Boolean(token) && Boolean(selectedThread),
    staleTime: THREAD_STALE_MS,
    refetchOnWindowFocus: false,
    refetchInterval: selectedThread ? THREAD_REFRESH_MS : false,
  });

  useEffect(() => {
    if (!selectedThread || !threadMessages.data) {
      return;
    }

    if (selectedThread.unread_count < 1) {
      return;
    }

    const relatedDetailKey =
      selectedThread.kind === 'request'
        ? ['client-request-detail', token, selectedThread.id]
        : ['booking-workspace', token, selectedThread.id];

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['message-unread-summary', token] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-shell-summary', token] }),
      queryClient.invalidateQueries({ queryKey: ['message-thread-summaries', token] }),
      queryClient.invalidateQueries({ queryKey: relatedDetailKey }),
    ]);
  }, [queryClient, selectedThread, threadMessages.data, token]);

  const threadReceiverId = useMemo(() => {
    if (!selectedThread) {
      return null;
    }

    if (isAdmin) {
      return selectedThread.participant_id ?? null;
    }

    for (const message of threadMessages.data ?? []) {
      if (message.senderId !== user?.id) {
        return message.senderId;
      }
      if (message.receiverId !== user?.id) {
        return message.receiverId;
      }
    }

    return null;
  }, [isAdmin, selectedThread, threadMessages.data, user?.id]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!token || !selectedThread) {
        throw new Error('Select a thread before sending an update.');
      }

      const content = draftMessage.trim();
      if (content.length < 2) {
        throw new Error('Write a short message before sending.');
      }

      const input = threadReceiverId ? { receiverId: threadReceiverId, content } : { content };

      return selectedThread.kind === 'request'
        ? apiClient.sendRequestThreadMessage(token, selectedThread.id, input)
        : apiClient.sendBookingThreadMessage(token, selectedThread.id, input);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setDraftMessage('');
      const relatedDetailKey = selectedThread
        ? selectedThread.kind === 'request'
          ? ['client-request-detail', token, selectedThread.id]
          : ['booking-workspace', token, selectedThread.id]
        : null;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['message-unread-summary', token] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-shell-summary', token] }),
        queryClient.invalidateQueries({ queryKey: ['message-thread-summaries', token] }),
        queryClient.invalidateQueries({ queryKey: ['communications-thread', token, selectedThread?.kind, selectedThread?.id] }),
        ...(relatedDetailKey ? [queryClient.invalidateQueries({ queryKey: relatedDetailKey })] : []),
      ]);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to send message right now.');
    },
  });

  return {
    user,
    isAdmin,
    isVendor,
    feedback,
    search,
    threadFilter,
    draftMessage,
    summary,
    currentPage,
    totalPages,
    paginatedThreadItems,
    selectedThreadKey,
    selectedThread,
    threadReceiverId,
    threadSummaries,
    threadMessages,
    sendPending: sendMutation.isPending,
    currentWorkspaceHref: isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard/client',
    actions: {
      dismissFeedback: () => setFeedback(null),
      setSearch: (value: string) => {
        setSearch(value);
        setPage(1);
      },
      applyThreadFilter: (nextFilter: ThreadFilter) => {
        setThreadFilter(nextFilter);
        setPage(1);
      },
      selectThread: (threadKey: string) => setRequestedThreadKey(threadKey),
      goToPreviousPage: () => setPage((value) => Math.max(1, value - 1)),
      goToNextPage: () => setPage((value) => Math.min(totalPages, value + 1)),
      setDraftMessage,
      sendMessage: () => sendMutation.mutate(),
    },
  };
}

export type CommunicationsModel = ReturnType<typeof useCommunications>;
