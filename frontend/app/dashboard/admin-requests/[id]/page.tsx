'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

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

function getInterestTone(status: string): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'neutral';
    case 'shortlisted':
      return 'warning';
    default:
      return 'info';
  }
}

const ADMIN_REQUEST_REFRESH_MS = 60_000;
const ADMIN_REQUEST_STALE_MS = 30_000;

export default function AdminRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const requestId = Number(params.id);
  const token = useAuthStore((state) => state.token);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedInterestId, setSelectedInterestId] = useState<number | null>(null);
  const [agreedPriceMinorOverride, setAgreedPriceMinorOverride] = useState<string | null>(null);
  const [agreedTimelineNoteOverride, setAgreedTimelineNoteOverride] = useState<string | null>(null);
  const [adminAssignmentNote, setAdminAssignmentNote] = useState('');

  const requestInterests = useQuery({
    queryKey: ['admin-client-request-interests', token, requestId],
    queryFn: () => apiClient.getAdminClientRequestInterests(token ?? '', requestId),
    enabled: Boolean(token) && Number.isFinite(requestId),
    staleTime: ADMIN_REQUEST_STALE_MS,
    refetchOnWindowFocus: false,
    refetchInterval: ADMIN_REQUEST_REFRESH_MS,
  });

  const interests = useMemo(() => requestInterests.data?.interests ?? [], [requestInterests.data?.interests]);
  const selectedInterest = useMemo(() => {
    if (!interests.length) {
      return null;
    }

    const explicitSelection =
      selectedInterestId !== null ? interests.find((interest) => interest.id === selectedInterestId) ?? null : null;

    return explicitSelection ?? interests.find((interest) => interest.status === 'approved') ?? interests[0] ?? null;
  }, [interests, selectedInterestId]);
  const agreedPriceTzs =
    agreedPriceMinorOverride ??
    (typeof selectedInterest?.proposed_price_minor === 'number' && Number.isFinite(selectedInterest.proposed_price_minor)
      ? String(Math.round(selectedInterest.proposed_price_minor / 100))
      : '');
  const agreedTimelineNote = agreedTimelineNoteOverride ?? (selectedInterest?.timeline_note ?? '');

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }
      if (!selectedInterest) {
        throw new Error('Choose one vendor proposal before assigning the request.');
      }

      const priceMinor = toMinorAmountFromTzsInput(agreedPriceTzs);
      if (priceMinor === null) {
        throw new Error('Enter a valid agreed price before sending the update.');
      }
      if (agreedTimelineNote.trim().length < 4) {
        throw new Error('Add the delivery timing you want the client to receive.');
      }

      return apiClient.assignAdminClientRequest(token, requestId, {
        vendor_interest_id: selectedInterest.id,
        agreed_price_minor: priceMinor,
        currency: requestInterests.data?.request.currency ?? 'TZS',
        agreed_timeline_note: agreedTimelineNote.trim(),
        admin_assignment_note: adminAssignmentNote.trim() || null,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-client-requests', token] }),
        queryClient.invalidateQueries({ queryKey: ['admin-client-request-interests', token, requestId] }),
      ]);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to assign this request right now.');
    },
  });

  return (
    <DashboardShell
      title="Request review"
      subtitle="Read the brief, choose one proposal, and send one final platform update."
      mobileQuickActions={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Link href="/dashboard/admin-requests">
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

        {requestInterests.isLoading ? (
          <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Card>
        ) : requestInterests.isError ? (
          <EmptyState icon={<ClipboardList className="size-5" />} title="This request is not loading right now" description="Refresh and try again in a moment." />
        ) : !requestInterests.data ? (
          <EmptyState icon={<ClipboardList className="size-5" />} title="This request is unavailable" description="Go back to the request queue and open another request." />
        ) : (
          <>
            <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">{requestInterests.data.request.service_type.category ?? 'Request'}</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{requestInterests.data.request.service_type.name}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{requestInterests.data.request.request_summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge label={requestInterests.data.request.status} tone="info" />
                <StatusBadge label={`${requestInterests.data.interests.length} proposals`} tone="warning" />
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Client brief</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                  <p><span className="font-medium text-[var(--text-primary)]">Client:</span> {requestInterests.data.request.client.email}</p>
                  <p><span className="font-medium text-[var(--text-primary)]">Scope:</span> {requestInterests.data.request.scope_details || 'No extra scope detail yet.'}</p>
                  <p><span className="font-medium text-[var(--text-primary)]">Timing:</span> {requestInterests.data.request.deadline_note || 'No timing note yet.'}</p>
                  <p><span className="font-medium text-[var(--text-primary)]">Budget:</span> {requestInterests.data.request.budget_note || 'No budget note yet.'}</p>
                </div>
              </Card>

              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Proposals</p>
                {!requestInterests.data.interests.length ? (
                  <div className="mt-4">
                    <EmptyState icon={<ClipboardList className="size-5" />} title="No proposals yet" description="Wait for vendors to respond before sending the final client update." />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {requestInterests.data.interests.map((interest) => {
                      const isSelected = selectedInterestId === interest.id;
                      return (
                        <button
                          key={interest.id}
                          type="button"
                          onClick={() => {
                            setSelectedInterestId(interest.id);
                            setAgreedPriceMinorOverride(
                              typeof interest.proposed_price_minor === 'number' && Number.isFinite(interest.proposed_price_minor)
                                ? String(Math.round(interest.proposed_price_minor / 100))
                                : '',
                            );
                            setAgreedTimelineNoteOverride(interest.timeline_note ?? '');
                          }}
                          className={isSelected ? 'w-full rounded-2xl border border-[var(--brand-primary)] bg-[rgba(59,130,246,0.06)] p-4 text-left' : 'w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-left'}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{interest.vendor.company_name || interest.vendor.email}</p>
                            <StatusBadge label={interest.status} tone={getInterestTone(interest.status)} />
                          </div>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">{formatMoney(interest.proposed_price_minor)} • {interest.timeline_note || 'No timeline note'}</p>
                          {interest.price_reason ? <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{interest.price_reason}</p> : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {requestInterests.data.interests.length ? (
              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Final platform update</p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {selectedInterest ? `Selected proposal: ${selectedInterest.vendor.company_name || selectedInterest.vendor.email}.` : 'Choose one proposal before sending the update.'}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="agreed-price">Agreed price</label>
                    <input
                      id="agreed-price"
                      type="number"
                      min="1"
                      step="1"
                      value={agreedPriceTzs}
                      onChange={(event) => setAgreedPriceMinorOverride(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                      placeholder="Enter amount in TZS"
                    />
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">Write the normal Tanzania shilling amount, for example `250000`.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="agreed-timeline">Agreed timeline</label>
                    <input
                      id="agreed-timeline"
                      type="text"
                      value={agreedTimelineNote}
                      onChange={(event) => setAgreedTimelineNoteOverride(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="admin-assignment-note">Platform note</label>
                  <textarea
                    id="admin-assignment-note"
                    value={adminAssignmentNote}
                    onChange={(event) => setAdminAssignmentNote(event.target.value)}
                    placeholder="Add a short update for the client before payment opens."
                    className="mt-2 min-h-[110px] w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
                  />
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !selectedInterestId}>
                    {assignMutation.isPending ? 'Sending update...' : 'Assign selected path'}
                  </Button>
                </div>
              </Card>
            ) : null}
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/admin-requests" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" variant="ghost">Back to requests</Button>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
