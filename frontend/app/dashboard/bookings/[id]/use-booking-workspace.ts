'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type { MessageRecord } from '@/lib/types';
import { isSignedLinkExpiringSoon } from '@/lib/ui/signed-link';

import {
  collectionSchema,
  deliverySchema,
  disputeSchema,
  messageSchema,
  type CollectionFormValues,
  type DeliveryFormValues,
  type DisputeFormValues,
  type MessageFormValues,
} from './booking-workspace.schemas';
import {
  BOOKING_THREAD_REFRESH_MS,
  BOOKING_WORKSPACE_STALE_MS,
  getFormErrorMessages,
  getRoleBookingNextStep,
  getRolePaymentEmptyStatus,
  getRolePaymentTitle,
  hasEscrowReviewContext,
} from './booking-workspace.utils';
import { useBookingWorkspaceActions } from './use-booking-workspace-actions';

function scrollToElement(id: string) {
  const element = document.getElementById(id);
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function useBookingWorkspace() {
  const params = useParams<{ id: string }>();
  const bookingId = Number(params.id);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

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
  const deliveryForm = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      delivery_note: '',
      delivery_link: '',
    },
  });

  const watchedCollectionMsisdn = useWatch({ control: collectionForm.control, name: 'msisdn' }) ?? '';
  const watchedCollectionProvider = useWatch({ control: collectionForm.control, name: 'provider' }) ?? '';
  const watchedMessageContent = useWatch({ control: messageForm.control, name: 'content' }) ?? '';
  const watchedDisputeReason = useWatch({ control: disputeForm.control, name: 'reason' }) ?? '';
  const watchedDeliveryNote = useWatch({ control: deliveryForm.control, name: 'delivery_note' }) ?? '';

  const booking = useQuery({
    queryKey: ['booking-workspace', token, bookingId],
    queryFn: () => apiClient.getBooking(token ?? '', bookingId),
    enabled: Boolean(token) && Number.isFinite(bookingId),
    staleTime: BOOKING_WORKSPACE_STALE_MS,
    refetchOnWindowFocus: false,
  });

  const isClient = user?.id === booking.data?.client_id;
  const isAdmin = Boolean(user?.roles.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN'));
  const isVendor = Boolean(user?.roles.includes('ROLE_VENDOR')) && booking.data?.vendor_user_id === user?.id;

  const deliveries = useQuery({
    queryKey: ['booking-workspace-deliveries', token, bookingId],
    queryFn: () => apiClient.getBookingDeliveries(token ?? '', bookingId),
    enabled: Boolean(token) && Number.isFinite(bookingId),
    staleTime: BOOKING_WORKSPACE_STALE_MS,
    refetchOnWindowFocus: false,
  });

  const bookingThread = useQuery<MessageRecord[]>({
    queryKey: ['booking-workspace-thread', token, bookingId],
    queryFn: () => apiClient.getBookingThread(token ?? '', bookingId),
    enabled: Boolean(token) && Number.isFinite(bookingId) && !isAdmin,
    staleTime: BOOKING_WORKSPACE_STALE_MS,
    refetchOnWindowFocus: false,
    refetchInterval: !isAdmin ? BOOKING_THREAD_REFRESH_MS : false,
  });

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

  const workspaceActions = useBookingWorkspaceActions({
    bookingEscrowId: booking.data?.escrow?.id,
    bookingId,
    collectionForm,
    deliveryForm,
    disputeForm,
    messageForm,
    queryClient,
    threadReceiverId,
    token,
  });

  const handleAttachmentDownload = async (attachmentId: number, currentUrl: string) => {
    if (!isSignedLinkExpiringSoon(currentUrl)) {
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const refreshed = await deliveries.refetch();
      const nextUrl =
        refreshed.data
          ?.flatMap((delivery) => delivery.attachments)
          .find((attachment) => attachment.id === attachmentId)
          ?.file_url ?? null;

      if (!nextUrl) {
        throw new Error('Fresh attachment link is not available right now.');
      }

      window.open(nextUrl, '_blank', 'noopener,noreferrer');
    } catch (refreshError) {
      workspaceActions.setters.setInlineSuccess(null);
      workspaceActions.setters.setFeedback(
        refreshError instanceof Error
          ? refreshError.message
          : 'Unable to refresh the attachment link right now.',
      );
    }
  };

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

  useEffect(() => {
    const hasUnsavedDrafts =
      (workspaceActions.state.showCollectionForm && collectionForm.formState.isDirty) ||
      (workspaceActions.state.showDisputeForm && disputeForm.formState.isDirty) ||
      messageForm.formState.isDirty ||
      deliveryForm.formState.isDirty ||
      workspaceActions.state.deliveryFiles.length > 0;

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
  }, [
    collectionForm.formState.isDirty,
    deliveryForm.formState.isDirty,
    disputeForm.formState.isDirty,
    messageForm.formState.isDirty,
    workspaceActions.state.deliveryFiles.length,
    workspaceActions.state.showCollectionForm,
    workspaceActions.state.showDisputeForm,
  ]);

  const nextStep = getRoleBookingNextStep(booking.data?.escrow?.status, Boolean(isClient), Boolean(isVendor));
  const showEscrowReviewContext = hasEscrowReviewContext(booking.data?.escrow ?? null);
  const collectionReady = Boolean(watchedCollectionMsisdn.trim() && watchedCollectionProvider.trim());
  const messageReady = Boolean(watchedMessageContent.trim().length >= 2);
  const disputeReady = Boolean(watchedDisputeReason.trim().length >= 12);
  const deliveryReady = Boolean(watchedDeliveryNote.trim().length >= 12);
  const collectionErrors = getFormErrorMessages(collectionForm.formState.errors as Record<string, unknown>);
  const messageErrors = getFormErrorMessages(messageForm.formState.errors as Record<string, unknown>);
  const disputeErrors = getFormErrorMessages(disputeForm.formState.errors as Record<string, unknown>);
  const deliveryErrors = getFormErrorMessages(deliveryForm.formState.errors as Record<string, unknown>);

  return {
    booking,
    deliveries,
    bookingThread,
    user,
    feedback: workspaceActions.state.feedback,
    inlineSuccess: workspaceActions.state.inlineSuccess,
    laneHref: isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard',
    isAdmin,
    isVendor,
    canManagePayment: Boolean(isClient),
    paymentPanelTitle: getRolePaymentTitle(Boolean(isClient), Boolean(isVendor)),
    paymentEmptyStatus: getRolePaymentEmptyStatus(Boolean(isClient), Boolean(isVendor)),
    showEscrowReviewContext,
    showCollectionForm: workspaceActions.state.showCollectionForm,
    showDisputeForm: workspaceActions.state.showDisputeForm,
    watchedCollectionMsisdn,
    watchedCollectionProvider,
    collectionReady,
    disputeReady,
    messageReady,
    deliveryReady,
    collectionErrors,
    disputeErrors,
    messageErrors,
    deliveryErrors,
    nextStep,
    collectionForm,
    disputeForm,
    messageForm,
    deliveryForm,
    deliveryFiles: workspaceActions.state.deliveryFiles,
    pendingDeliveryDeleteId: workspaceActions.state.pendingDeliveryDeleteId,
    pendingAttachmentDeleteId: workspaceActions.state.pendingAttachmentDeleteId,
    threadReceiverId,
    mutationState: workspaceActions.mutationState,
    actions: {
      ...workspaceActions.actions,
      jumpToThreadSection: () => scrollToElement('booking-thread-section'),
      setDeliveryFiles: workspaceActions.setters.setDeliveryFiles,
      downloadAttachment: (attachmentId: number, currentUrl: string) => {
        void handleAttachmentDownload(attachmentId, currentUrl);
      },
    },
    formHandlers: workspaceActions.formHandlers,
  };
}

export type BookingWorkspaceModel = ReturnType<typeof useBookingWorkspace>;
