'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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

function getRequestTone(status: string): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'awaiting_payment':
      return 'warning';
    case 'funded':
    case 'completed':
      return 'success';
    default:
      return 'info';
  }
}

const REQUEST_DETAIL_REFRESH_MS = 60_000;
const REQUEST_DETAIL_STALE_MS = 30_000;

export default function ClientRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestId = Number(params.id);
  const token = useAuthStore((state) => state.token);
  const [feedback, setFeedback] = useState<string | null>(null);

  const request = useQuery({
    queryKey: ['client-request-detail', token, requestId],
    queryFn: () => apiClient.getClientRequest(token ?? '', requestId),
    enabled: Boolean(token) && Number.isFinite(requestId),
    staleTime: REQUEST_DETAIL_STALE_MS,
    refetchOnWindowFocus: false,
    refetchInterval: REQUEST_DETAIL_REFRESH_MS,
  });

  const openBooking = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }
      return apiClient.openClientRequestBooking(token, requestId);
    },
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['client-request-detail', token, requestId] }),
        queryClient.invalidateQueries({ queryKey: ['client-requests', token] }),
      ]);
      router.push(`/dashboard/bookings/${response.booking.id}`);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to open booking');
    },
  });

  const canOpenBooking = request.data?.status === 'awaiting_payment' || request.data?.status === 'funded' || request.data?.status === 'completed';
  const openBookingLabel = request.data?.status === 'awaiting_payment' ? 'Open payment booking' : 'Open current booking';

  const nextStep = useMemo(() => {
    switch (request.data?.status) {
      case 'awaiting_payment':
        return 'Price and timeline are ready. Open the payment booking when you are ready.';
      case 'funded':
        return 'Payment protection is active. Continue from bookings.';
      case 'completed':
        return 'This request already finished its flow.';
      default:
        return 'Wait for the next admin update on this request.';
    }
  }, [request.data?.status]);

  return (
    <DashboardShell
      title="Request"
      subtitle="Read the update here, then move only to the next page that is ready."
      mobileQuickActions={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Link href="/dashboard/requests">
            <Button size="sm" variant="ghost" className="w-full">Back</Button>
          </Link>
          <Link href="/dashboard/communications">
            <Button size="sm" variant="ghost" className="w-full">Inbox</Button>
          </Link>
          {canOpenBooking ? (
            <Button size="sm" className="w-full" onClick={() => openBooking.mutate()} disabled={openBooking.isPending}>
              {openBooking.isPending ? 'Opening...' : 'Booking'}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        {feedback ? <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} /> : null}

        {request.isLoading ? (
          <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Card>
        ) : request.isError ? (
          <EmptyState icon={<ClipboardList className="size-5" />} title="This request is not loading right now" description="Refresh and try again in a moment." />
        ) : request.data ? (
          <>
            <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">{request.data.service_type.category ?? 'Request'}</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">{request.data.service_type.name}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{request.data.request_summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge label={request.data.status} tone={getRequestTone(request.data.status)} />
                {typeof request.data.unread_thread_count === 'number' && request.data.unread_thread_count > 0 ? (
                  <StatusBadge label={`${request.data.unread_thread_count} unread`} tone="warning" />
                ) : null}
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Your request</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                  <p><span className="font-medium text-[var(--text-primary)]">Scope:</span> {request.data.scope_details || 'No extra scope note yet.'}</p>
                  <p><span className="font-medium text-[var(--text-primary)]">Timing:</span> {request.data.deadline_note || 'No timing note yet.'}</p>
                  <p><span className="font-medium text-[var(--text-primary)]">Budget:</span> {request.data.budget_note || 'No budget note yet.'}</p>
                </div>
              </Card>

              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Admin update</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                  <p><span className="font-medium text-[var(--text-primary)]">Next step:</span> {nextStep}</p>
                  <p><span className="font-medium text-[var(--text-primary)]">Price:</span> {formatBuyerMoney(request.data.agreed_price_minor, request.data.currency ?? 'TZS')}</p>
                  <p><span className="font-medium text-[var(--text-primary)]">Timeline:</span> {request.data.agreed_timeline_note || 'Waiting for admin timing update.'}</p>
                  <p><span className="font-medium text-[var(--text-primary)]">Platform note:</span> {request.data.admin_assignment_note || 'WOLFIX is still managing this request.'}</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  {canOpenBooking ? (
                    <Button className="w-full sm:w-auto" onClick={() => openBooking.mutate()} disabled={openBooking.isPending}>
                      {openBooking.isPending ? 'Opening booking...' : openBookingLabel}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  ) : null}
                </div>
              </Card>
            </div>
          </>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/requests" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" variant="ghost">Back to requests</Button>
          </Link>
          <Link href="/dashboard/request-services" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" variant="ghost">Open lanes</Button>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
