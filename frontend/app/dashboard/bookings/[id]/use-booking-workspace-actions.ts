'use client';

import { useMutation, type QueryClient } from '@tanstack/react-query';
import { useState, type Dispatch, type SetStateAction } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { apiClient } from '@/lib/api/client';
import { normalizeMobileMoneyProviderCode } from '@/lib/finance/mobile-money';

import type {
  CollectionFormValues,
  DeliveryFormValues,
  DisputeFormValues,
  MessageFormValues,
} from './booking-workspace.schemas';
import {
  isDirectDeliveryUploadUnavailable,
  resolveAttachmentMimeType,
  type BookingInlineSuccessState,
  uploadAttachmentToDirectTarget,
} from './booking-workspace.utils';

function scrollToElement(id: string) {
  const element = document.getElementById(id);
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

interface UseBookingWorkspaceActionsOptions {
  bookingEscrowId?: number | null;
  bookingId: number;
  collectionForm: UseFormReturn<CollectionFormValues>;
  deliveryForm: UseFormReturn<DeliveryFormValues>;
  disputeForm: UseFormReturn<DisputeFormValues>;
  messageForm: UseFormReturn<MessageFormValues>;
  queryClient: QueryClient;
  threadReceiverId: number | null;
  token: string | null;
}

interface BookingWorkspaceActionState {
  feedback: string | null;
  inlineSuccess: BookingInlineSuccessState | null;
  showCollectionForm: boolean;
  showDisputeForm: boolean;
  deliveryFiles: File[];
  pendingDeliveryDeleteId: number | null;
  pendingAttachmentDeleteId: number | null;
}

export function useBookingWorkspaceActions({
  bookingEscrowId,
  bookingId,
  collectionForm,
  deliveryForm,
  disputeForm,
  messageForm,
  queryClient,
  threadReceiverId,
  token,
}: UseBookingWorkspaceActionsOptions) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inlineSuccess, setInlineSuccess] = useState<BookingInlineSuccessState | null>(null);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [pendingDeliveryDeleteId, setPendingDeliveryDeleteId] = useState<number | null>(null);
  const [pendingAttachmentDeleteId, setPendingAttachmentDeleteId] = useState<number | null>(null);

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
      if (!token || !bookingEscrowId) {
        throw new Error('Escrow selection missing');
      }

      return apiClient.createCollection(
        token,
        bookingEscrowId,
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

  const submitDelivery = useMutation({
    mutationFn: async (values: DeliveryFormValues) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const basePayload = {
        delivery_note: values.delivery_note,
        delivery_link: values.delivery_link || null,
      };

      if (deliveryFiles.length === 0) {
        return apiClient.submitBookingDelivery(token, bookingId, basePayload);
      }

      try {
        const prepared = await apiClient.prepareBookingDeliveryDirectUpload(token, bookingId, {
          files: deliveryFiles.map((file) => ({
            file_name: file.name,
            mime_type: resolveAttachmentMimeType(file),
          })),
        });

        await Promise.all(
          prepared.files.map((item, index) =>
            uploadAttachmentToDirectTarget(
              item.upload.url,
              item.upload.method,
              item.upload.headers,
              deliveryFiles[index],
            ),
          ),
        );

        return apiClient.submitBookingDelivery(token, bookingId, {
          ...basePayload,
          stored_attachments: prepared.files.map((item) => ({
            file_name: item.file_name,
            storage_path: item.storage_path,
            mime_type: item.mime_type,
            upload_token: item.finalize.token,
            expires: item.finalize.expires,
          })),
        });
      } catch (error) {
        if (error instanceof Error && isDirectDeliveryUploadUnavailable(error)) {
          return apiClient.submitBookingDelivery(token, bookingId, basePayload, deliveryFiles);
        }

        throw error;
      }
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'delivery',
        message: 'Delivery submitted. The booking record and attachment links have been refreshed.',
      });
      deliveryForm.reset({ delivery_note: '', delivery_link: '' });
      setDeliveryFiles([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-workspace-deliveries', token, bookingId] }),
      ]);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to submit delivery');
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
    scrollToElement('booking-collection-summary');
  });

  const handleMessageSubmit = messageForm.handleSubmit(async (values) => {
    setFeedback(null);
    await sendMessage.mutateAsync(values);
  }, async () => {
    scrollToElement('booking-message-summary');
  });

  const handleDisputeSubmit = disputeForm.handleSubmit(async (values) => {
    setFeedback(null);
    await disputeEscrow.mutateAsync(values);
  }, async () => {
    scrollToElement('booking-dispute-summary');
  });

  const handleDeliverySubmit = deliveryForm.handleSubmit(async (values) => {
    setFeedback(null);
    await submitDelivery.mutateAsync(values);
  }, async () => {
    scrollToElement('booking-delivery-summary');
  });

  return {
    state: {
      feedback,
      inlineSuccess,
      showCollectionForm,
      showDisputeForm,
      deliveryFiles,
      pendingDeliveryDeleteId,
      pendingAttachmentDeleteId,
    } satisfies BookingWorkspaceActionState,
    setters: {
      setFeedback,
      setInlineSuccess,
      setShowCollectionForm,
      setShowDisputeForm,
      setDeliveryFiles,
    } satisfies {
      setFeedback: Dispatch<SetStateAction<string | null>>;
      setInlineSuccess: Dispatch<SetStateAction<BookingInlineSuccessState | null>>;
      setShowCollectionForm: Dispatch<SetStateAction<boolean>>;
      setShowDisputeForm: Dispatch<SetStateAction<boolean>>;
      setDeliveryFiles: Dispatch<SetStateAction<File[]>>;
    },
    mutationState: {
      createEscrowPending: createEscrow.isPending,
      collectPaymentPending: collectPayment.isPending,
      releaseEscrowPending: releaseEscrow.isPending,
      disputeEscrowPending: disputeEscrow.isPending,
      submitDeliveryPending: submitDelivery.isPending,
      sendMessagePending: sendMessage.isPending,
    },
    actions: {
      dismissFeedback: () => setFeedback(null),
      createEscrow: () => createEscrow.mutate(),
      releaseEscrow: () => releaseEscrow.mutate(),
      toggleCollectionForm: () => setShowCollectionForm((value) => !value),
      toggleDisputeForm: () => setShowDisputeForm((value) => !value),
      closeCollectionForm: () => setShowCollectionForm(false),
      closeDisputeForm: () => {
        setShowDisputeForm(false);
        disputeForm.reset({ reason: '' });
      },
      clearDeliveryDraft: () => {
        deliveryForm.reset({ delivery_note: '', delivery_link: '' });
        setDeliveryFiles([]);
      },
      deleteDelivery: (deliveryId: number) => deleteDelivery.mutate(deliveryId),
      deleteAttachment: (deliveryId: number, attachmentId: number) => deleteAttachment.mutate({ deliveryId, attachmentId }),
    },
    formHandlers: {
      handleCollectionSubmit,
      handleDisputeSubmit,
      handleDeliverySubmit,
      handleMessageSubmit,
    },
  };
}
