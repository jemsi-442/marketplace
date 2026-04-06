'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BriefcaseBusiness, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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

const ADMIN_CAPABILITIES_STALE_MS = 60_000;

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

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-TZ');
}

export default function AdminCapabilityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const capabilityId = Number(params?.id);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const capability = useQuery({
    queryKey: ['admin-vendor-capability-detail', token, capabilityId],
    queryFn: () => apiClient.getAdminVendorCapability(token ?? '', capabilityId),
    enabled: Boolean(token) && Number.isFinite(capabilityId) && capabilityId > 0,
    staleTime: ADMIN_CAPABILITIES_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const reviewMutation = useMutation({
    mutationFn: async (decision: 'approve' | 'return') => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.reviewAdminVendorCapability(token, capabilityId, {
        decision,
        review_note: reviewNote.trim() || null,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-vendor-capabilities', token] }),
        queryClient.invalidateQueries({ queryKey: ['admin-vendor-capability-detail', token, capabilityId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-shell-summary', token] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-service-capabilities'] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-request-feed'] }),
      ]);
      if (response.capability.admin_review_note) {
        setReviewNote(response.capability.admin_review_note);
      }
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to review this capability right now.');
    },
  });

  const data = capability.data;

  return (
    <DashboardShell
      title="Capability review"
      subtitle="Use this page to approve a vendor lane for matching or return it for changes."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/admin-capabilities">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Back to list
              <ArrowRight className="size-4 rotate-180" />
            </Button>
          </Link>
          <Link href="/dashboard/admin">
            <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
              Open admin
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {feedback ? <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} /> : null}

        {capability.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-[28px]" />
            <Skeleton className="h-72 rounded-[28px]" />
          </div>
        ) : capability.isError || !data ? (
          <EmptyState
            icon={<BriefcaseBusiness className="size-5" />}
            title="Capability review is not loading"
            description="Go back to the capability list and try again."
            action={
              <Button onClick={() => router.push('/dashboard/admin-capabilities')}>Open capability lanes</Button>
            }
          />
        ) : (
          <>
            <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.10),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8faff_56%,#eef3ff_100%)] p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.16)] bg-white/84 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                    <ShieldCheck className="size-3.5" />
                    Capability lane review
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <StatusBadge label={data.service_type.group_title || data.service_type.category || 'Capability lane'} tone="info" />
                    <StatusBadge label={data.review_state || (data.approved_by_admin ? 'approved' : 'pending')} tone={data.approved_by_admin ? 'success' : data.review_state === 'returned' ? 'warning' : 'info'} />
                    <StatusBadge label={data.capacity_status} tone="info" />
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{data.service_type.name}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                    Review this capability inside its business lane first, then decide whether price, proof, and turnaround are coherent enough to feed matched vendor work.
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                    {data.vendor?.company_name || data.vendor?.email || 'Vendor profile'} • {data.service_type.category || 'Uncategorized'}
                  </p>
                </div>

                <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Review posture</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    {[
                      { label: 'Starting price', value: formatMoney(data.starting_price_minor) },
                      { label: 'Experience', value: data.experience_level || '--' },
                      { label: 'Last review', value: data.reviewed_at ? formatDateTime(data.reviewed_at) : 'Not reviewed yet' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-4">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.label}</p>
                        <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
              {[
                {
                  title: 'Lane context',
                  detail: 'Judge the capability inside its business lane first, not as an isolated card.',
                  icon: <Layers3 className="size-4" />,
                },
                {
                  title: 'Proof and scope',
                  detail: 'Portfolio note, price, and turnaround should support the same delivery story.',
                  icon: <Sparkles className="size-4" />,
                },
                {
                  title: 'Review outcome',
                  detail: 'Approve when the lane is ready for matching, or return it with a note that leads to better clarity.',
                  icon: <ShieldCheck className="size-4" />,
                },
              ].map((item) => (
                <Card key={item.title} className="h-full rounded-[26px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(99,102,241,0.10)] text-[var(--brand-primary)]">
                      {item.icon}
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">{item.title}</p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{item.detail}</p>
                </Card>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Capability details</p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-secondary)]">
                  <p><span className="font-semibold text-[var(--text-primary)]">Vendor email:</span> {data.vendor?.email || '--'}</p>
                  <p><span className="font-semibold text-[var(--text-primary)]">Experience level:</span> {data.experience_level}</p>
                  <p><span className="font-semibold text-[var(--text-primary)]">Turnaround:</span> {data.turnaround_note || 'No turnaround note yet.'}</p>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Portfolio or delivery note</p>
                    <p className="mt-2">{data.portfolio_summary || 'No portfolio summary yet.'}</p>
                  </div>
                  {data.reviewed_at ? (
                    <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--panel-muted)] px-4 py-3">
                      <p className="font-semibold text-[var(--text-primary)]">Latest review</p>
                      <p className="mt-2">Reviewed at: {formatDateTime(data.reviewed_at)}</p>
                      <p className="mt-1">Reviewed by: {data.reviewed_by_admin?.email || 'WOLFIX admin'}</p>
                    </div>
                  ) : null}
                  {data.admin_review_note ? (
                    <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--panel-muted)] px-4 py-3">
                      <p className="font-semibold text-[var(--text-primary)]">Latest admin note</p>
                      <p className="mt-2">{data.admin_review_note}</p>
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Review decision</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Approve or return this lane</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  Approve when the vendor lane is ready for request matching. Return it when the price, scope, or proof needs changes first.
                </p>

                <div className="mt-5 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Admin note</label>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    className="mt-3 min-h-[160px] w-full rounded-[18px] border border-[var(--line)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
                    placeholder="Use this note when you need the vendor to change price, proof, or delivery context."
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button onClick={() => reviewMutation.mutate('approve')} disabled={reviewMutation.isPending}>
                    {reviewMutation.isPending ? 'Saving review...' : 'Approve capability'}
                  </Button>
                  <Button variant="ghost" className="border border-[var(--line)]" onClick={() => reviewMutation.mutate('return')} disabled={reviewMutation.isPending}>
                    {reviewMutation.isPending ? 'Saving review...' : 'Return for changes'}
                  </Button>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
