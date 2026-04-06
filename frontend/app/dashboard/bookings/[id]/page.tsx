'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { CheckCircle2, Layers3, Link2, MessagesSquare, Paperclip, ShieldAlert, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { formatMsisdnPreview, getMobileMoneyProviderLabel, MOBILE_MONEY_PROVIDERS, normalizeMobileMoneyProviderCode, normalizeTanzanianMsisdn } from '@/lib/finance/mobile-money';
import type { BookingEscrowSummary, MessageRecord } from '@/lib/types';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';
import { getBookingStatusTone, getEscrowStatusTone } from '@/lib/status';

const collectionSchema = z.object({
  msisdn: z
    .string()
    .min(1, 'Phone number is required')
    .transform((value) => normalizeTanzanianMsisdn(value))
    .refine((value) => /^255[67]\d{8}$/.test(value), 'Use a Tanzania mobile number like 07XXXXXXXX or 2557XXXXXXX'),
  provider: z.string().min(2, 'Provider is required'),
});

const messageSchema = z.object({
  content: z.string().min(2, 'Message is too short').max(2000, 'Message is too long'),
});

const disputeSchema = z.object({
  reason: z.string().trim().min(12, 'Share a short reason so admin knows what needs review').max(500, 'Keep the dispute note within 500 characters'),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;
type MessageFormValues = z.infer<typeof messageSchema>;
type DisputeFormValues = z.infer<typeof disputeSchema>;
const BOOKING_THREAD_REFRESH_MS = 45_000;
const BOOKING_WORKSPACE_STALE_MS = 30_000;

function getFormErrorMessages(errors: Record<string, unknown>): string[] {
  return Object.values(errors)
    .map((error) => {
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
      }

      return null;
    })
    .filter((message): message is string => Boolean(message));
}

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

function getClientPaymentStatusLabel(status?: string | null): string {
  switch (status) {
    case 'CREATED':
      return 'Ready for payment';
    case 'ACTIVE':
      return 'Payment protected';
    case 'DISPUTED':
      return 'Under review';
    case 'RELEASED':
      return 'Payment released';
    case 'REFUNDED':
      return 'Payment returned';
    case 'RESOLVED':
      return 'Review completed';
    default:
      return 'Protection needed';
  }
}

function getClientNextMoveLabel(status?: string | null): string {
  switch (status) {
    case 'CREATED':
      return 'Complete payment';
    case 'ACTIVE':
      return 'Review the work';
    case 'DISPUTED':
      return 'Wait for review';
    case 'RELEASED':
      return 'Leave feedback';
    case 'REFUNDED':
      return 'Review the outcome';
    case 'RESOLVED':
      return 'Check the outcome';
    default:
      return 'Protect payment';
  }
}

function getRolePaymentTitle(isClient: boolean, isVendor: boolean): string {
  if (isClient) {
    return 'Payment status';
  }

  if (isVendor) {
    return 'Client payment status';
  }

  return 'Client payment lane';
}

function getRolePaymentEmptyStatus(isClient: boolean, isVendor: boolean): string {
  if (isClient) {
    return 'Protection needed';
  }

  if (isVendor) {
    return 'Waiting for client payment setup';
  }

  return 'Waiting for client payment setup';
}

function getRoleNextMoveLabel(status: string | null | undefined, isClient: boolean, isVendor: boolean): string {
  if (isClient) {
    return getClientNextMoveLabel(status);
  }

  if (!status) {
    return isVendor ? 'Wait for client payment' : 'Review client payment progress';
  }

  switch (status) {
    case 'CREATED':
      return isVendor ? 'Wait for client payment' : 'Track payment request progress';
    case 'ACTIVE':
      return isVendor ? 'Continue delivery updates' : 'Review delivery and payment progress';
    case 'DISPUTED':
      return isVendor ? 'Wait for admin review' : 'Continue review';
    case 'RELEASED':
      return isVendor ? 'Check payout progress' : 'Close the payment review';
    case 'REFUNDED':
      return isVendor ? 'Review the outcome' : 'Review the outcome';
    case 'RESOLVED':
      return isVendor ? 'Check the outcome' : 'Check the outcome';
    default:
      return isVendor ? 'Wait for client payment' : 'Review client payment progress';
  }
}

function getRoleBookingNextStep(status: string | null | undefined, isClient: boolean, isVendor: boolean): string {
  if (!status) {
    if (isClient) {
      return 'Protect the payment first so this booking can move into a safe payment step.';
    }

    if (isVendor) {
      return 'Wait for the client to protect payment before treating this booking as active work.';
    }

    return 'Watch for the client payment setup before this booking moves into active delivery.';
  }

  switch (status) {
    case 'CREATED':
      if (isClient) {
        return 'Complete the payment request so this booking can move into protected delivery.';
      }

      if (isVendor) {
        return 'Wait for client payment confirmation before continuing delivery work.';
      }

      return 'Track the payment request until the client funding step completes.';

    case 'ACTIVE':
      if (isClient) {
        return 'Review the work carefully, then confirm release only when everything looks right.';
      }

      if (isVendor) {
        return 'Use the thread for progress and delivery updates while the protected work stays active.';
      }

      return 'Review delivery and payment activity, then step in only if the booking needs help.';

    case 'DISPUTED':
      if (isClient) {
        return 'Wait for review and keep any follow-up focused on the work, delivery, and evidence.';
      }

      if (isVendor) {
        return 'Wait for admin review and keep all follow-up tied to evidence and delivery facts.';
      }

      return 'Review the dispute trail and keep the booking communication focused on evidence.';

    default:
      if (isClient) {
        return 'Review the final record and leave feedback if the work is complete.';
      }

      if (isVendor) {
        return 'Review the final booking record and wait for the next platform update if needed.';
      }

      return 'Review the final booking record and move back to the queue if no further action is needed.';
  }
}

function getEscrowResolutionLabel(resolution?: string | null): string | null {
  switch (resolution) {
    case 'VENDOR_RELEASE':
      return 'Released to vendor';
    case 'CLIENT_REFUND_EXTERNAL':
      return 'Refunded to client';
    default:
      return resolution?.trim() ? resolution.replaceAll('_', ' ') : null;
  }
}

function hasEscrowReviewContext(escrow?: BookingEscrowSummary | null): boolean {
  if (!escrow) {
    return false;
  }

  return Boolean(
    escrow.dispute_reason?.trim()
      || escrow.dispute_source?.trim()
      || escrow.resolution?.trim()
      || escrow.resolution_note?.trim()
      || escrow.evidence_summary?.trim()
      || escrow.tags?.length
      || escrow.disputed_at
      || escrow.resolved_at,
  );
}

function getDeliveryStatusTone(status?: string | null): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'submitted':
      return 'info';
    case 'changes_requested':
      return 'warning';
    case 'approved':
      return 'success';
    default:
      return 'neutral';
  }
}

function formatAttachmentSize(sizeBytes?: number | null): string {
  if (!sizeBytes || sizeBytes <= 0) {
    return 'File ready';
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
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

export default function BookingWorkspacePage() {
  const params = useParams<{ id: string }>();
  const bookingId = Number(params.id);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inlineSuccess, setInlineSuccess] = useState<{ scope: 'escrow' | 'collection' | 'release' | 'dispute' | 'message' | 'delivery'; message: string } | null>(null);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [pendingDeliveryDeleteId, setPendingDeliveryDeleteId] = useState<number | null>(null);
  const [pendingAttachmentDeleteId, setPendingAttachmentDeleteId] = useState<number | null>(null);

  const collectionForm = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      msisdn: '',
      provider: 'MPESA',
    },
  });

  const messageForm = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: '',
    },
  });
  const disputeForm = useForm<DisputeFormValues>({
    resolver: zodResolver(disputeSchema),
    defaultValues: {
      reason: '',
    },
  });
  const watchedCollectionMsisdn = useWatch({ control: collectionForm.control, name: 'msisdn' }) ?? '';
  const watchedCollectionProvider = useWatch({ control: collectionForm.control, name: 'provider' }) ?? '';
  const watchedMessageContent = useWatch({ control: messageForm.control, name: 'content' }) ?? '';
  const watchedDisputeReason = useWatch({ control: disputeForm.control, name: 'reason' }) ?? '';

  const booking = useQuery({
    queryKey: ['booking-workspace', token, bookingId],
    queryFn: () => apiClient.getBooking(token ?? '', bookingId),
    enabled: Boolean(token) && Number.isFinite(bookingId),
    staleTime: BOOKING_WORKSPACE_STALE_MS,
    refetchOnWindowFocus: false,
  });

  const deliveries = useQuery({
    queryKey: ['booking-workspace-deliveries', token, bookingId],
    queryFn: () => apiClient.getBookingDeliveries(token ?? '', bookingId),
    enabled: Boolean(token) && Number.isFinite(bookingId),
    staleTime: BOOKING_WORKSPACE_STALE_MS,
    refetchOnWindowFocus: false,
  });

  const isClient = user?.id === booking.data?.client_id;
  const isAdmin = Boolean(user?.roles.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN'));
  const isVendor = Boolean(user?.roles.includes('ROLE_VENDOR')) && booking.data?.vendor_user_id === user?.id;
  const laneHref = isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard';
  const canManagePayment = Boolean(isClient);
  const paymentPanelTitle = getRolePaymentTitle(Boolean(isClient), Boolean(isVendor));
  const paymentEmptyStatus = getRolePaymentEmptyStatus(Boolean(isClient), Boolean(isVendor));

  const bookingThread = useQuery<MessageRecord[]>({
    queryKey: ['booking-workspace-thread', token, bookingId],
    queryFn: () => apiClient.getBookingThread(token ?? '', bookingId),
    enabled: Boolean(token) && Number.isFinite(bookingId) && !isAdmin,
    staleTime: BOOKING_WORKSPACE_STALE_MS,
    refetchOnWindowFocus: false,
    refetchInterval: !isAdmin ? BOOKING_THREAD_REFRESH_MS : false,
  });

  useEffect(() => {
    if (isAdmin || !bookingThread.data) {
      return;
    }

    if ((booking.data?.unread_thread_count ?? 0) < 1) {
      return;
    }

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['message-unread-summary', token] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-shell-summary', token] }),
      queryClient.invalidateQueries({ queryKey: ['booking-summary', token] }),
      queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] }),
    ]);
  }, [booking.data?.unread_thread_count, bookingId, bookingThread.data, isAdmin, queryClient, token]);

  const threadReceiverId = useMemo(() => {
    if (isAdmin) {
      return null;
    }

    for (const message of bookingThread.data ?? []) {
      if (message.senderId !== user?.id) {
        return message.senderId;
      }
      if (message.receiverId !== user?.id) {
        return message.receiverId;
      }
    }

    return null;
  }, [bookingThread.data, isAdmin, user?.id]);

  const createEscrow = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.createBookingEscrow(token, bookingId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'escrow',
        message: 'Payment protection is ready. This booking can now move into the payment request step and funding confirmation.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-summary', token] }),
      ]);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to create escrow');
    },
  });

  const collectPayment = useMutation({
    mutationFn: async (values: CollectionFormValues) => {
      if (!token || !booking.data?.escrow?.id) {
        throw new Error('Escrow selection missing');
      }

      return apiClient.createCollection(
        token,
        booking.data.escrow.id,
        values.msisdn,
        normalizeMobileMoneyProviderCode(values.provider) ?? values.provider.toUpperCase(),
      );
    },
    onSuccess: async (response) => {
      setFeedback(`Payment request created for ${response.escrow_reference}`);
      setInlineSuccess({
        scope: 'collection',
        message: 'Payment request sent. Delivery should continue only after client payment confirms on this protected booking.',
      });
      setShowCollectionForm(false);
      collectionForm.reset({ msisdn: '', provider: 'MPESA' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-summary', token] }),
      ]);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to initiate collection');
    },
  });

  const releaseEscrow = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.releaseBookingEscrow(token, bookingId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'release',
        message: 'Payment released. This booking can now move toward clean closure and review.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-summary', token] }),
      ]);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to release payment to provider');
    },
  });

  const disputeEscrow = useMutation({
    mutationFn: async (values: DisputeFormValues) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.disputeBookingEscrow(token, bookingId, values.reason);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'dispute',
        message: 'Dispute opened. Keep any follow-up in this booking tied to delivery facts and evidence.',
      });
      setShowDisputeForm(false);
      disputeForm.reset({ reason: '' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-summary', token] }),
      ]);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to dispute escrow');
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (values: MessageFormValues) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.sendBookingThreadMessage(
        token,
        bookingId,
        threadReceiverId
          ? {
              receiverId: threadReceiverId,
              content: values.content,
            }
          : {
              content: values.content,
            },
      );
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'message',
        message: 'Booking message sent. The latest update is now attached to this work item.',
      });
      messageForm.reset({ content: '' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['message-unread-summary', token] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-shell-summary', token] }),
        queryClient.invalidateQueries({ queryKey: ['booking-summary', token] }),
        queryClient.invalidateQueries({ queryKey: ['booking-workspace-thread', token, bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] }),
      ]);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to send message');
    },
  });

  const deleteDelivery = useMutation({
    mutationFn: async (deliveryId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.deleteBookingDelivery(token, bookingId, deliveryId);
    },
    onMutate: (deliveryId) => {
      setPendingDeliveryDeleteId(deliveryId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'delivery',
        message: 'The delivery record was removed and the booking state was refreshed for admin review.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-workspace-deliveries', token, bookingId] }),
      ]);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to remove delivery');
    },
    onSettled: () => {
      setPendingDeliveryDeleteId(null);
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async ({ deliveryId, attachmentId }: { deliveryId: number; attachmentId: number }) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.deleteBookingDeliveryAttachment(token, bookingId, deliveryId, attachmentId);
    },
    onMutate: ({ attachmentId }) => {
      setPendingAttachmentDeleteId(attachmentId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'delivery',
        message: 'The attachment was removed from the delivery record and storage was cleaned up too.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-workspace-deliveries', token, bookingId] }),
      ]);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to remove attachment');
    },
    onSettled: () => {
      setPendingAttachmentDeleteId(null);
    },
  });

  const handleCollectionSubmit = collectionForm.handleSubmit(async (values) => {
    setFeedback(null);
    await collectPayment.mutateAsync(values);
  }, async () => {
    scrollToValidationSummary('booking-collection-summary');
  });

  const handleMessageSubmit = messageForm.handleSubmit(async (values) => {
    setFeedback(null);
    await sendMessage.mutateAsync(values);
  }, async () => {
    scrollToValidationSummary('booking-message-summary');
  });

  const handleDisputeSubmit = disputeForm.handleSubmit(async (values) => {
    setFeedback(null);
    await disputeEscrow.mutateAsync(values);
  }, async () => {
    scrollToValidationSummary('booking-dispute-summary');
  });

  const nextStep = getRoleBookingNextStep(booking.data?.escrow?.status, Boolean(isClient), Boolean(isVendor));
  const escrowReviewContext = booking.data?.escrow ?? null;
  const escrowResolutionLabel = getEscrowResolutionLabel(escrowReviewContext?.resolution);
  const showEscrowReviewContext = hasEscrowReviewContext(escrowReviewContext);
  const collectionReady = Boolean(watchedCollectionMsisdn.trim() && watchedCollectionProvider.trim());
  const messageReady = Boolean(watchedMessageContent.trim().length >= 2);
  const disputeReady = Boolean(watchedDisputeReason.trim().length >= 12);
  const collectionErrors = getFormErrorMessages(collectionForm.formState.errors as Record<string, unknown>);
  const messageErrors = getFormErrorMessages(messageForm.formState.errors as Record<string, unknown>);
  const disputeErrors = getFormErrorMessages(disputeForm.formState.errors as Record<string, unknown>);

  useEffect(() => {
    const hasUnsavedDrafts =
      (showCollectionForm && collectionForm.formState.isDirty) ||
      (showDisputeForm && disputeForm.formState.isDirty) ||
      messageForm.formState.isDirty;

    if (!hasUnsavedDrafts) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [collectionForm.formState.isDirty, disputeForm.formState.isDirty, messageForm.formState.isDirty, showCollectionForm, showDisputeForm]);

  const scrollToValidationSummary = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const jumpToBookingSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <DashboardShell
      title="Booking"
      subtitle="Use this page for payment, delivery, and thread updates only."
      mobileQuickActions={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Link href={laneHref}>
            <Button size="sm" variant="ghost" className="w-full">Back</Button>
          </Link>
          <Link href="/dashboard/communications">
            <Button size="sm" variant="ghost" className="w-full">Inbox</Button>
          </Link>
          {!isAdmin ? (
            <Button size="sm" className="w-full" onClick={() => jumpToBookingSection('booking-thread-section')}>Thread</Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        {feedback ? <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} /> : null}

        {booking.isLoading ? (
          <Card className="p-5 sm:p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Card>
        ) : booking.isError || !booking.data ? (
          <EmptyState icon={<ShieldAlert className="size-5" />} title="This booking is not loading right now" description="Refresh and try again in a moment." />
        ) : (
          <>
            <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] space-y-4 p-5 sm:p-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Booking summary</p>
                <h1 className="font-display text-2xl text-[var(--text-primary)] sm:text-3xl">{booking.data.service_title}</h1>
                <p className="text-sm leading-7 text-[var(--text-secondary)]">{booking.data.request_summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={booking.data.status} tone={getBookingStatusTone(booking.data.status)} />
                {booking.data.escrow ? <StatusBadge label={booking.data.escrow.status} tone={getEscrowStatusTone(booking.data.escrow.status)} /> : null}
                {typeof booking.data.unread_thread_count === 'number' && booking.data.unread_thread_count > 0 ? <StatusBadge label={`${booking.data.unread_thread_count} unread`} tone="warning" /> : null}
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4 p-5 sm:p-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Request details</p>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Original request</h2>
                </div>
                <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Scope</span>
                    <span className="mt-2 block">{booking.data.scope_details?.trim() ? booking.data.scope_details : 'No extra scope note was attached to this booking.'}</span>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Timing</span>
                    <span className="mt-2 block">{booking.data.deadline_note?.trim() ? booking.data.deadline_note : 'No timing note was attached to this booking.'}</span>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Next step</span>
                    <span className="mt-2 block">{nextStep}</span>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] space-y-4 p-5 sm:p-6" id="booking-controls-section">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Payment</p>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">{paymentPanelTitle}</h2>
                </div>
                <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Status</span>
                    <span className="mt-2 block text-[var(--text-primary)]">{booking.data.escrow ? getClientPaymentStatusLabel(booking.data.escrow.status) : paymentEmptyStatus}</span>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Protected amount</span>
                    <span className="mt-2 block text-[var(--text-primary)]">{booking.data.escrow ? formatBuyerMoney(booking.data.escrow.amount_minor, booking.data.escrow.currency) : '--'}</span>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Next move</span>
                    <span className="mt-2 block text-[var(--text-primary)]">{getRoleNextMoveLabel(booking.data.escrow?.status, Boolean(isClient), Boolean(isVendor))}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {canManagePayment && !booking.data.escrow ? (
                    <Button className="w-full sm:w-auto" onClick={() => createEscrow.mutate()} disabled={createEscrow.isPending}>
                      {createEscrow.isPending ? 'Protecting...' : 'Protect payment'}
                    </Button>
                  ) : null}
                  {canManagePayment && booking.data.escrow?.status === 'CREATED' ? (
                    <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setShowCollectionForm((value) => !value)}>
                      {showCollectionForm ? 'Close form' : 'Open payment form'}
                    </Button>
                  ) : null}
                  {canManagePayment && booking.data.escrow?.status === 'ACTIVE' ? (
                    <>
                      <Button className="w-full sm:w-auto" onClick={() => releaseEscrow.mutate()} disabled={releaseEscrow.isPending}>
                        {releaseEscrow.isPending ? 'Releasing...' : 'Release payment'}
                      </Button>
                      <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setShowDisputeForm((value) => !value)}>
                        {showDisputeForm ? 'Close issue form' : 'Need help'}
                      </Button>
                    </>
                  ) : null}
                </div>

                {showEscrowReviewContext ? (
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Review record</p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {escrowReviewContext?.status === 'RESOLVED'
                          ? 'This booking now carries the final dispute outcome and the admin review notes below.'
                          : 'This booking already has dispute context attached so follow-up can stay grounded in the same facts.'}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {escrowReviewContext?.disputed_at ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Dispute opened</p>
                          <p className="mt-1 text-[var(--text-primary)]">{formatDateTime(escrowReviewContext.disputed_at)}</p>
                        </div>
                      ) : null}
                      {escrowReviewContext?.resolved_at ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Review completed</p>
                          <p className="mt-1 text-[var(--text-primary)]">{formatDateTime(escrowReviewContext.resolved_at)}</p>
                        </div>
                      ) : null}
                      {escrowResolutionLabel ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Outcome</p>
                          <p className="mt-1 text-[var(--text-primary)]">{escrowResolutionLabel}</p>
                        </div>
                      ) : null}
                      {escrowReviewContext?.dispute_source?.trim() ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Source</p>
                          <p className="mt-1 text-[var(--text-primary)]">{escrowReviewContext.dispute_source.replaceAll('_', ' ')}</p>
                        </div>
                      ) : null}
                    </div>

                    {escrowReviewContext?.dispute_reason?.trim() ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Dispute note</p>
                        <p className="mt-2 leading-7 text-[var(--text-primary)]">{escrowReviewContext.dispute_reason}</p>
                      </div>
                    ) : null}

                    {escrowReviewContext?.resolution_note?.trim() ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Resolution note</p>
                        <p className="mt-2 leading-7 text-[var(--text-primary)]">{escrowReviewContext.resolution_note}</p>
                      </div>
                    ) : null}

                    {escrowReviewContext?.evidence_summary?.trim() ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Evidence summary</p>
                        <p className="mt-2 leading-7 text-[var(--text-primary)]">{escrowReviewContext.evidence_summary}</p>
                      </div>
                    ) : null}

                    {escrowReviewContext?.tags?.length ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Review tags</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {escrowReviewContext.tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!canManagePayment ? (
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {isVendor
                      ? 'The client completes payment on this booking. Use the thread for progress and delivery updates.'
                      : 'Payment actions for this booking stay on the client lane. Use admin review tools if intervention is needed.'}
                  </div>
                ) : null}

                {canManagePayment && showCollectionForm && booking.data.escrow?.status === 'CREATED' ? (
                  <form className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4" onSubmit={handleCollectionSubmit}>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="booking-msisdn">Phone number</label>
                      <input
                        id="booking-msisdn"
                        inputMode="tel"
                        className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                        placeholder="07XXXXXXXX"
                        {...collectionForm.register('msisdn', {
                          onBlur: (event) => {
                            const normalized = formatMsisdnPreview(event.target.value);
                            collectionForm.setValue('msisdn', normalized, {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            });
                          },
                        })}
                      />
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">
                        Accepts `07XXXXXXXX`, `7XXXXXXXX`, `2557XXXXXXX`, or `+2557XXXXXXX`.
                      </p>
                      {watchedCollectionMsisdn.trim() ? (
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          Normalized: <span className="font-medium text-[var(--text-primary)]">{formatMsisdnPreview(watchedCollectionMsisdn)}</span>
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="booking-provider">Mobile money network</label>
                        <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                          Selected: {getMobileMoneyProviderLabel(watchedCollectionProvider)}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {MOBILE_MONEY_PROVIDERS.map((provider) => {
                          const active = normalizeMobileMoneyProviderCode(watchedCollectionProvider) === provider.code;

                          return (
                            <button
                              key={provider.code}
                              type="button"
                              onClick={() => {
                                collectionForm.setValue('provider', provider.code, {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                });
                              }}
                              className={`rounded-2xl border px-4 py-4 text-left transition ${
                                active
                                  ? 'border-[var(--brand-primary)] bg-[linear-gradient(180deg,rgba(99,102,241,0.06)_0%,#ffffff_100%)] shadow-[0_14px_34px_rgba(79,70,229,0.14)] ring-1 ring-[rgba(79,70,229,0.14)]'
                                  : 'border-[var(--line)] bg-white hover:border-[rgba(79,70,229,0.24)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className={`flex h-14 w-28 items-center justify-center overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] ${provider.logoShellClassName}`}>
                                  <Image
                                    src={provider.logoPath}
                                    alt={provider.label}
                                    width={112}
                                    height={56}
                                    className="max-h-full w-full object-contain"
                                  />
                                </div>
                                {active ? <CheckCircle2 className="size-5 shrink-0 text-[var(--brand-primary)]" /> : null}
                              </div>
                              <div className="mt-3">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-[var(--text-primary)]">{provider.label}</p>
                                  {active ? (
                                    <span className="rounded-full bg-[rgba(79,70,229,0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
                                      Selected
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">{provider.subtitle}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-xs text-[var(--text-secondary)]">
                        Choose the same network that will receive the payment prompt on the number above.
                      </p>
                    </div>
                    {collectionErrors.length ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {collectionErrors.join(' ')}
                      </div>
                    ) : null}
                    {collectionReady ? <InlineStateNote tone="success" message="Payment request details look ready." /> : null}
                    {inlineSuccess?.scope === 'collection' ? <InlineStateNote tone="success" message={inlineSuccess.message} /> : null}
                    <div className="flex flex-wrap gap-3">
                      <Button className="w-full sm:w-auto" type="submit" disabled={collectPayment.isPending}>{collectPayment.isPending ? 'Sending request...' : 'Send payment request'}</Button>
                      <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={() => setShowCollectionForm(false)}>Cancel</Button>
                    </div>
                  </form>
                ) : null}

                {canManagePayment && showDisputeForm && booking.data.escrow?.status === 'ACTIVE' ? (
                  <form className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4" onSubmit={handleDisputeSubmit}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="booking-dispute-reason">What should admin review?</label>
                      <textarea
                        id="booking-dispute-reason"
                        rows={5}
                        className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                        placeholder="Explain what is wrong with the delivery, payment step, or agreement so admin can review the facts."
                        {...disputeForm.register('reason')}
                      />
                      <p className="text-xs text-[var(--text-secondary)]">
                        Keep this focused on work quality, delivery status, scope mismatch, or payment concern.
                      </p>
                    </div>
                    {disputeErrors.length ? (
                      <div id="booking-dispute-summary" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {disputeErrors.join(' ')}
                      </div>
                    ) : null}
                    {disputeReady ? <InlineStateNote tone="success" message="Your dispute note gives admin enough context to review this booking." /> : null}
                    {inlineSuccess?.scope === 'dispute' ? <InlineStateNote tone="success" message={inlineSuccess.message} /> : null}
                    <div className="flex flex-wrap gap-3">
                      <Button className="w-full sm:w-auto" type="submit" disabled={disputeEscrow.isPending}>
                        {disputeEscrow.isPending ? 'Opening issue...' : 'Send to admin review'}
                      </Button>
                      <Button
                        type="button"
                        className="w-full sm:w-auto"
                        variant="ghost"
                        onClick={() => {
                          setShowDisputeForm(false);
                          disputeForm.reset({ reason: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] space-y-4 p-5 sm:p-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Delivery</p>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Submitted work</h2>
                </div>
                <div className="space-y-3">
                  {deliveries.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full rounded-2xl" />
                      <Skeleton className="h-24 w-full rounded-2xl" />
                    </div>
                  ) : deliveries.data?.length ? (
                    deliveries.data.map((delivery) => (
                      <div key={delivery.id} className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <StatusBadge label={delivery.status} tone={getDeliveryStatusTone(delivery.status)} />
                          <span className="text-xs text-[var(--text-secondary)]">{formatDateTime(delivery.submitted_at)}</span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{delivery.delivery_note}</p>
                        {delivery.delivery_link ? (
                          <a href={delivery.delivery_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--brand-primary)]">
                            <Link2 className="size-4" /> Open link
                          </a>
                        ) : null}
                        {delivery.attachments.length ? (
                          <div className="mt-4 space-y-2">
                            {delivery.attachments.map((attachment) => (
                              <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm">
                                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                                  <Paperclip className="size-4" />
                                  <a href={attachment.file_url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{attachment.file_name}</a>
                                  <span className="text-[var(--text-secondary)]">{formatAttachmentSize(attachment.size_bytes)}</span>
                                </div>
                                {isAdmin ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteAttachment.mutate({ deliveryId: delivery.id, attachmentId: attachment.id })}
                                    disabled={pendingAttachmentDeleteId === attachment.id}
                                  >
                                    <Trash2 className="mr-2 size-4" />
                                    {pendingAttachmentDeleteId === attachment.id ? 'Removing...' : 'Remove'}
                                  </Button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {isAdmin ? (
                          <div className="mt-4">
                            <Button size="sm" variant="ghost" onClick={() => deleteDelivery.mutate(delivery.id)} disabled={pendingDeliveryDeleteId === delivery.id}>
                              <Trash2 className="mr-2 size-4" />
                              {pendingDeliveryDeleteId === delivery.id ? 'Removing delivery...' : 'Remove delivery'}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <EmptyState icon={<Layers3 className="size-5" />} title="No delivery yet" description="Delivery submissions will appear here once work is uploaded into this booking." />
                  )}
                </div>
              </Card>

              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] space-y-4 p-5 sm:p-6" id="booking-thread-section">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Thread</p>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Booking messages</h2>
                </div>
                <div className="space-y-3">
                  {isAdmin ? (
                    <EmptyState icon={<MessagesSquare className="size-5" />} title="Open inbox for booking communication" description="Admin-managed booking threads are handled from the inbox so you can choose the right participant." />
                  ) : bookingThread.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full rounded-2xl" />
                      <Skeleton className="h-24 w-full rounded-2xl" />
                    </div>
                  ) : (bookingThread.data ?? []).length ? (
                    bookingThread.data?.map((message) => {
                      const outgoing = message.senderId === user?.id;
                      return (
                        <div key={message.id} className={outgoing ? 'rounded-2xl border border-[rgba(59,130,246,0.12)] bg-[rgba(59,130,246,0.06)] p-4' : 'rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4'}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{outgoing ? 'You' : message.senderLabel}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{formatDateTime(message.createdAt)}</p>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{message.content}</p>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState icon={<MessagesSquare className="size-5" />} title="No booking messages yet" description="Use the form below when you need one clear update tied to this booking." />
                  )}
                </div>
                {!isAdmin ? (
                  <form className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4" onSubmit={handleMessageSubmit}>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="workspace-message-content">Message</label>
                      <textarea id="workspace-message-content" rows={6} placeholder={isVendor ? 'Share progress or clarify scope.' : 'Ask a question or confirm the next step.'} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]" {...messageForm.register('content')} />
                    </div>
                    {messageErrors.length ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {messageErrors.join(' ')}
                      </div>
                    ) : null}
                    {messageReady ? <InlineStateNote tone="success" message="This booking update is ready to send." /> : null}
                    {!threadReceiverId ? <InlineStateNote tone="info" message="WOLFIX will route the first booking message to the right admin thread automatically." /> : null}
                    {inlineSuccess?.scope === 'message' ? <InlineStateNote tone="success" message={inlineSuccess.message} /> : null}
                    <div className="flex flex-wrap gap-3">
                      <Button className="w-full sm:w-auto" type="submit" disabled={sendMessage.isPending}>
                        {sendMessage.isPending ? 'Sending update...' : 'Send update'}
                      </Button>
                      <Link href="/dashboard/communications" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto" type="button" variant="ghost">Open inbox</Button>
                      </Link>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-sm text-[var(--text-secondary)]">
                    Use the inbox to message the client or vendor from the correct admin-managed booking thread.
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
