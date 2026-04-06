'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessagesSquare, Search, SendHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type { MessageRecord, ThreadSummaryRecord } from '@/lib/types';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

type ThreadKind = 'request' | 'booking';
const PAGE_SIZE = 10;
const THREAD_REFRESH_MS = 60_000;
const THREAD_STALE_MS = 20_000;

function buildThreadKey(kind: ThreadKind, id: number): string {
  return `${kind}:${id}`;
}

function getStatusTone(status: string): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'awaiting_payment':
    case 'vendor_selected':
      return 'warning';
    case 'funded':
    case 'completed':
    case 'approved':
      return 'success';
    case 'vendor_interest_open':
    case 'delivery_submitted':
    case 'revision_requested':
    case 'confirmed':
    case 'active':
      return 'info';
    default:
      return 'neutral';
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Just now';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-TZ');
}

export default function CommunicationsPage() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [threadFilter, setThreadFilter] = useState<'all' | 'request' | 'booking' | 'unread'>('all');
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
  const selectedThreadKey = useMemo(() => {
    if (!paginatedThreadItems.length) {
      return null;
    }

    return paginatedThreadItems.some((item) => buildThreadKey(item.kind, item.id) === requestedThreadKey)
      ? requestedThreadKey
      : buildThreadKey(paginatedThreadItems[0].kind, paginatedThreadItems[0].id);
  }, [paginatedThreadItems, requestedThreadKey]);

  const applyThreadFilter = (nextFilter: typeof threadFilter) => {
    setThreadFilter(nextFilter);
    setPage(1);
  };

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

  const currentWorkspaceHref = isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard/client';

  return (
    <DashboardShell
      title="Inbox"
      subtitle="Choose a thread, read it here, then reply only when needed."
      mobileQuickActions={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Link href={currentWorkspaceHref}>
            <Button size="sm" variant="ghost" className="w-full">Back</Button>
          </Link>
          {selectedThread ? (
            <Link href={selectedThread.href}>
              <Button size="sm" className="w-full">Open page</Button>
            </Link>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        {feedback ? <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} /> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <button type="button" onClick={() => applyThreadFilter('all')} className={`text-left ${threadFilter === 'all' ? 'translate-y-[-1px]' : ''}`}>
            <Card className="rounded-[22px] border border-[rgba(15,23,42,0.08)] p-4 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">All threads</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.total}</p>
            </Card>
          </button>
          <button type="button" onClick={() => applyThreadFilter('request')} className={`text-left ${threadFilter === 'request' ? 'translate-y-[-1px]' : ''}`}>
            <Card className="rounded-[22px] border border-[rgba(15,23,42,0.08)] p-4 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Request threads</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.requests}</p>
            </Card>
          </button>
          <button type="button" onClick={() => applyThreadFilter('booking')} className={`text-left ${threadFilter === 'booking' ? 'translate-y-[-1px]' : ''}`}>
            <Card className="rounded-[22px] border border-[rgba(15,23,42,0.08)] p-4 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Booking threads</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.bookings}</p>
            </Card>
          </button>
          <button type="button" onClick={() => applyThreadFilter('unread')} className={`text-left ${threadFilter === 'unread' ? 'translate-y-[-1px]' : ''}`}>
            <Card className="rounded-[22px] border border-[rgba(15,23,42,0.08)] p-4 transition hover:border-[rgba(79,70,229,0.18)] hover:shadow-[0_10px_24px_rgba(79,70,229,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Unread updates</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{summary.unread}</p>
            </Card>
          </button>
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Threads</p>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Choose one thread</h2>
            </div>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <Search className="size-4 text-[var(--text-secondary)]" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search inbox"
                  className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'request', label: 'Requests' },
                  { value: 'booking', label: 'Bookings' },
                  { value: 'unread', label: 'Unread' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => applyThreadFilter(filter.value as typeof threadFilter)}
                    className={threadFilter === filter.value ? 'rounded-full border border-[var(--brand-primary)] bg-[rgba(59,130,246,0.12)] px-4 py-2 text-sm font-medium text-[var(--brand-primary)]' : 'rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)]'}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {threadSummaries.isLoading && !paginatedThreadItems.length ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
                </div>
              ) : !paginatedThreadItems.length ? (
                <EmptyState icon={<MessagesSquare className="size-5" />} title="No thread matches this view" description="Try another filter or wait for the next platform thread." />
              ) : (
                <>
                  {paginatedThreadItems.map((item) => {
                    const isSelected = buildThreadKey(item.kind, item.id) === selectedThreadKey;
                    return (
                      <button
                        key={buildThreadKey(item.kind, item.id)}
                        type="button"
                        onClick={() => setRequestedThreadKey(buildThreadKey(item.kind, item.id))}
                        className={isSelected ? 'w-full rounded-2xl border border-[var(--brand-primary)] bg-[rgba(59,130,246,0.06)] p-4 text-left' : 'w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-left'}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.subtitle}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge label={item.kind === 'request' ? 'Request' : 'Booking'} tone="info" />
                            <StatusBadge label={item.status} tone={getStatusTone(item.status)} />
                            {item.unread_count > 0 ? <StatusBadge label={`${item.unread_count} unread`} tone="warning" /> : null}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.preview}</p>
                      </button>
                    );
                  })}
                  {totalPages > 1 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-4">
                      <p className="text-sm text-[var(--text-secondary)]">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                          Previous
                        </Button>
                        <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </Card>

          <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Conversation</p>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Read first, reply second</h2>
            </div>
            <div className="mt-4 space-y-4">
              {!selectedThread ? (
                <EmptyState icon={<MessagesSquare className="size-5" />} title="No thread selected yet" description="Choose a request or booking thread from the left side first." />
              ) : threadMessages.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
                </div>
              ) : threadMessages.isError ? (
                <EmptyState icon={<MessagesSquare className="size-5" />} title="This thread is not loading right now" description="Refresh and try again in a moment." />
              ) : (
                <>
                  <div className="space-y-3">
                    {(threadMessages.data ?? []).length ? (
                      threadMessages.data?.map((message) => {
                        const isMine = message.senderId === user?.id;
                        return (
                          <div key={message.id} className={isMine ? 'rounded-2xl border border-[rgba(59,130,246,0.12)] bg-[rgba(59,130,246,0.06)] p-4' : 'rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4'}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-sm font-medium text-[var(--text-primary)]">{isMine ? 'You' : message.senderLabel}</p>
                              <p className="text-xs text-[var(--text-secondary)]">{formatDateTime(message.createdAt)}</p>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{message.content}</p>
                          </div>
                        );
                      })
                    ) : (
                      <EmptyState
                        icon={<MessagesSquare className="size-5" />}
                        title="No messages yet"
                        description="You can start this thread from here when a real platform update is needed."
                      />
                    )}
                  </div>

                  <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                    <div className="space-y-3">
                      <textarea
                        value={draftMessage}
                        onChange={(event) => setDraftMessage(event.target.value)}
                        rows={4}
                        placeholder="Write a clear update for this thread"
                        className="w-full resize-none rounded-2xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-[var(--text-secondary)]">
                          {draftMessage.trim().length >= 2
                            ? 'This thread update is ready to send.'
                            : 'Write at least a short message before sending.'}
                        </p>
                        <Button className="w-full sm:w-auto" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || draftMessage.trim().length < 2}>
                          {sendMutation.isPending ? 'Sending...' : 'Send update'}
                          <SendHorizontal className="ml-2 size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
