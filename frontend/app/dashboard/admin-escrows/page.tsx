'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, ShieldX } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';
import { getEscrowStatusTone } from '@/lib/status';

const PAGE_SIZE = 10;
const ADMIN_ESCROWS_STALE_MS = 60_000;

function formatBuyerMoney(amount?: number | null, currency = 'TZS'): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '--';
  }

  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export default function AdminEscrowsPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [resolutionNotes, setResolutionNotes] = useState<Record<number, string>>({});
  const [evidenceSummaries, setEvidenceSummaries] = useState<Record<number, string>>({});
  const [tagInputs, setTagInputs] = useState<Record<number, string>>({});
  const [pendingActions, setPendingActions] = useState<Record<number, 'release' | 'refund' | undefined>>({});

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

  const parseTags = (value: string): string[] =>
    Array.from(new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))).slice(0, 8);

  return (
    <DashboardShell
      title="Disputes"
      subtitle="Review disputed escrows, then resolve each case in favor of the vendor or the client."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/admin">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Back
              <ShieldCheck className="size-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
              Open bookings
              <ShieldX className="size-4" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {feedback ? <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {escrows.isLoading ? (
            Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-[24px]" />)
          ) : (
            <>
              <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Open disputes</p>
                <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{summary.disputed}</p>
              </Card>
              <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Current page</p>
                <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{currentPage}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Page {currentPage} of {totalPages}</p>
              </Card>
            </>
          )}
        </div>

        <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Dispute queue</p>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Open one escrow at a time</h2>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <Search className="size-4 text-[var(--text-secondary)]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by reference or participant email"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>

            {escrows.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-44 rounded-[24px]" />)}
              </div>
            ) : items.length ? (
              <div className="space-y-4">
                {items.map((escrow) => (
                  <Card key={escrow.id} className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
                    {(() => {
                      const pendingAction = pendingActions[escrow.id];
                      const rowIsPending = Boolean(pendingAction);

                      return (
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-lg font-semibold text-[var(--text-primary)]">{escrow.reference}</p>
                          <StatusBadge label={escrow.status} tone={getEscrowStatusTone(escrow.status)} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Client</p>
                            <p className="mt-1 text-sm text-[var(--text-primary)]">{escrow.client_label}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Vendor</p>
                            <p className="mt-1 text-sm text-[var(--text-primary)]">{escrow.vendor_label}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Amount</p>
                            <p className="mt-1 text-sm text-[var(--text-primary)]">{formatBuyerMoney(escrow.amount_minor, escrow.currency)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Opened</p>
                            <p className="mt-1 text-sm text-[var(--text-primary)]">{escrow.disputed_at ? new Date(escrow.disputed_at).toLocaleString('en-TZ') : 'Recently opened'}</p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Client dispute note</p>
                          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                            {escrow.dispute_reason?.trim() ? escrow.dispute_reason : 'The client opened this dispute without a detailed note.'}
                          </p>
                          {escrow.dispute_source ? (
                            <p className="mt-2 text-xs text-[var(--text-tertiary)]">Source: {escrow.dispute_source}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-3 lg:w-[360px]">
                        <textarea
                          value={resolutionNotes[escrow.id] ?? ''}
                          onChange={(event) => setResolutionNotes((current) => ({ ...current, [escrow.id]: event.target.value }))}
                          rows={4}
                          placeholder="Resolution note for the final decision"
                          disabled={rowIsPending}
                          className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                        />
                        <input
                          value={evidenceSummaries[escrow.id] ?? ''}
                          onChange={(event) => setEvidenceSummaries((current) => ({ ...current, [escrow.id]: event.target.value }))}
                          placeholder="Evidence summary"
                          disabled={rowIsPending}
                          className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                        />
                        <input
                          value={tagInputs[escrow.id] ?? ''}
                          onChange={(event) => setTagInputs((current) => ({ ...current, [escrow.id]: event.target.value }))}
                          placeholder="Tags, separated by commas"
                          disabled={rowIsPending}
                          className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                        />
                        {rowIsPending ? (
                          <p className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                            {pendingAction === 'release'
                              ? 'Resolving this dispute in favor of the vendor...'
                              : 'Processing the client refund resolution...'}
                          </p>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <Button
                          onClick={() =>
                            resolveEscrow.mutate({
                              escrowId: escrow.id,
                              releaseToVendor: true,
                              resolutionNote: resolutionNotes[escrow.id] ?? '',
                              evidenceSummary: evidenceSummaries[escrow.id] ?? '',
                              tags: parseTags(tagInputs[escrow.id] ?? ''),
                            })
                          }
                          disabled={rowIsPending}
                          className="justify-between"
                        >
                          {pendingAction === 'release' ? 'Releasing...' : 'Release to vendor'}
                          <ShieldCheck className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            resolveEscrow.mutate({
                              escrowId: escrow.id,
                              releaseToVendor: false,
                              resolutionNote: resolutionNotes[escrow.id] ?? '',
                              evidenceSummary: evidenceSummaries[escrow.id] ?? '',
                              tags: parseTags(tagInputs[escrow.id] ?? ''),
                            })
                          }
                          disabled={rowIsPending}
                          className="justify-between border border-[var(--line)]"
                        >
                          {pendingAction === 'refund' ? 'Refunding...' : 'Refund client'}
                          <ShieldX className="size-4" />
                        </Button>
                        </div>
                      </div>
                    </div>
                      );
                    })()}
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<ShieldCheck className="size-5" />}
                title="No disputes in this view"
                description={search.trim() ? 'Try a different reference or participant email.' : 'Disputed escrows will appear here when they need an admin decision.'}
              />
            )}

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage <= 1 || escrows.isLoading}
                className="border border-[var(--line)]"
              >
                Previous
              </Button>
              <p className="text-sm text-[var(--text-secondary)]">Page {currentPage} of {totalPages}</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage >= totalPages || escrows.isLoading}
                className="border border-[var(--line)]"
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
