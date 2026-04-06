'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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

function formatMoney(amount?: number | null, currency = 'TZS'): string {
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

function toMinorAmountFromTzsInput(value: string): number | null {
  const normalized = value.trim();
  if (normalized === '') {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
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

const VENDOR_REQUEST_REFRESH_MS = 60_000;
const VENDOR_REQUEST_STALE_MS = 30_000;

export default function VendorRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const requestId = Number(params.id);
  const token = useAuthStore((state) => state.token);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [proposedPriceTzs, setProposedPriceTzs] = useState('');
  const [priceReason, setPriceReason] = useState('');
  const [timelineNote, setTimelineNote] = useState('');
  const [message, setMessage] = useState('');

  const requestDetail = useQuery({
    queryKey: ['vendor-request-detail', token, requestId],
    queryFn: () => apiClient.getVendorRequestDetail(token ?? '', requestId),
    enabled: Boolean(token),
    staleTime: VENDOR_REQUEST_STALE_MS,
    refetchOnWindowFocus: false,
    refetchInterval: VENDOR_REQUEST_REFRESH_MS,
  });
  const request = requestDetail.data ?? null;

  const proposalMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const trimmedReason = priceReason.trim();
      const trimmedTimeline = timelineNote.trim();
      const parsedPriceMinor = toMinorAmountFromTzsInput(proposedPriceTzs);

      if (parsedPriceMinor === null) {
        throw new Error('Enter a valid price before you send the proposal.');
      }
      if (trimmedReason.length < 12) {
        throw new Error('Explain the price clearly so admin can compare you fairly.');
      }
      if (trimmedTimeline.length < 4) {
        throw new Error('Add the time you need to complete this work.');
      }

      return apiClient.submitVendorRequestInterest(token, requestId, {
        proposed_price_minor: parsedPriceMinor,
        price_reason: trimmedReason,
        timeline_note: trimmedTimeline,
        message: message.trim() || null,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vendor-request-feed', token] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-request-detail', token, requestId] }),
      ]);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to send proposal right now.');
    },
  });

  return (
    <DashboardShell
      title="Request"
      subtitle="Read the request, send one clear proposal, then wait for admin review."
      mobileQuickActions={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Link href="/dashboard/vendor-requests">
            <Button size="sm" variant="ghost" className="w-full">Back</Button>
          </Link>
          <Link href="/dashboard/communications">
            <Button size="sm" variant="ghost" className="w-full">Inbox</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {feedback ? <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} /> : null}

        {requestDetail.isLoading ? (
          <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Card>
        ) : requestDetail.isError ? (
          <EmptyState icon={<ClipboardList className="size-5" />} title="This request is not loading right now" description="Refresh and try again in a moment." />
        ) : !request ? (
          <EmptyState icon={<ClipboardList className="size-5" />} title="This request is not available right now" description="Refresh and try again in a moment." />
        ) : (
          <>
            <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">{request.service_type.category ?? 'Request'}</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{request.service_type.name}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{request.request_summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge label={request.interest ? 'Proposal sent' : 'Proposal needed'} tone={request.interest ? 'success' : 'info'} />
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Request details</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                  <p><span className="font-medium text-[var(--text-primary)]">Scope:</span> {request.scope_details || 'No extra detail yet.'}</p>
                  <p><span className="font-medium text-[var(--text-primary)]">Client timing:</span> {request.deadline_note || 'No timing note yet.'}</p>
                  <p><span className="font-medium text-[var(--text-primary)]">Client budget:</span> {request.budget_note || 'No budget note yet.'}</p>
                  <p><span className="font-medium text-[var(--text-primary)]">Your current lane:</span> {request.capability.experience_level || 'Experience not stated'} • {formatMoney(request.capability.starting_price_minor)} • {request.capability.turnaround_note || 'No default turnaround yet'}</p>
                </div>
              </Card>

              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Proposal</p>
                {request.interest ? (
                  <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                    <p><span className="font-medium text-[var(--text-primary)]">Status:</span> {request.interest.status}</p>
                    <p><span className="font-medium text-[var(--text-primary)]">Submitted:</span> {formatDateTime(request.interest.submitted_at)}</p>
                    <p>Wait for admin review instead of sending another proposal.</p>
                  </div>
                ) : (
                  <form
                    className="mt-4 grid gap-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      proposalMutation.mutate();
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="proposed-price">Your price</label>
                        <input
                          id="proposed-price"
                          type="number"
                          min="1"
                          step="1"
                          value={proposedPriceTzs}
                          onChange={(event) => setProposedPriceTzs(event.target.value)}
                          placeholder="Enter amount in TZS"
                          className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                        />
                        <p className="mt-2 text-xs text-[var(--text-secondary)]">Write the normal Tanzania shilling amount, for example `250000`.</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="timeline-note">Delivery time</label>
                        <input
                          id="timeline-note"
                          type="text"
                          value={timelineNote}
                          onChange={(event) => setTimelineNote(event.target.value)}
                          placeholder="Example: 5 working days"
                          className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="price-reason">Why this price</label>
                      <textarea
                        id="price-reason"
                        value={priceReason}
                        onChange={(event) => setPriceReason(event.target.value)}
                        placeholder="Explain scope, complexity, time, tools, or delivery quality."
                        className="mt-2 min-h-[120px] w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="admin-message">Extra note for admin</label>
                      <textarea
                        id="admin-message"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Anything that helps admin compare your proposal fairly."
                        className="mt-2 min-h-[100px] w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" disabled={proposalMutation.isPending}>
                        {proposalMutation.isPending ? 'Sending proposal...' : 'Send proposal'}
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/vendor-requests" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" variant="ghost">Back to requests</Button>
          </Link>
          <Link href="/dashboard/vendor-capabilities" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" variant="ghost">Open capability lanes</Button>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
