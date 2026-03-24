'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CircleDollarSign, Layers3, MessagesSquare, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { BookingProgressStrip } from '@/components/dashboard/booking-progress-strip';
import { BookingTimeline } from '@/components/dashboard/booking-timeline';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { ActionSummaryStrip } from '@/components/ui/action-summary-strip';
import { DraftStatusNote } from '@/components/ui/draft-status-note';
import { FormActionDock } from '@/components/ui/form-action-dock';
import { FormSection } from '@/components/ui/form-section';
import { FormHint } from '@/components/ui/form-hint';
import { FormValidationSummary } from '@/components/ui/form-validation-summary';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { PriorityBanner } from '@/components/ui/priority-banner';
import { SectionNavigator } from '@/components/ui/section-navigator';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkflowSteps } from '@/components/ui/workflow-steps';
import { WorkspaceGuide } from '@/components/ui/workspace-guide';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getBookingStatusTone, getEscrowStatusTone } from '@/lib/status';

const collectionSchema = z.object({
  msisdn: z.string().min(8, 'Phone number is required'),
  provider: z.string().min(2, 'Provider is required'),
});

const messageSchema = z.object({
  content: z.string().min(2, 'Message is too short').max(2000, 'Message is too long'),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;
type MessageFormValues = z.infer<typeof messageSchema>;

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

export default function BookingWorkspacePage() {
  const params = useParams<{ id: string }>();
  const bookingId = Number(params.id);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inlineSuccess, setInlineSuccess] = useState<{ scope: 'escrow' | 'collection' | 'release' | 'dispute' | 'message'; message: string } | null>(null);
  const [showCollectionForm, setShowCollectionForm] = useState(false);

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
  const watchedCollectionMsisdn = useWatch({ control: collectionForm.control, name: 'msisdn' }) ?? '';
  const watchedCollectionProvider = useWatch({ control: collectionForm.control, name: 'provider' }) ?? '';
  const watchedMessageContent = useWatch({ control: messageForm.control, name: 'content' }) ?? '';

  const booking = useQuery({
    queryKey: ['booking-workspace', token, bookingId],
    queryFn: () => apiClient.getBooking(token ?? '', bookingId),
    enabled: Boolean(token) && Number.isFinite(bookingId),
  });

  const services = useQuery({
    queryKey: ['booking-workspace-services', token],
    queryFn: () => apiClient.getServices(token),
    enabled: Boolean(token),
  });

  const messages = useQuery({
    queryKey: ['booking-workspace-messages', token],
    queryFn: () => apiClient.getMessages(token ?? ''),
    enabled: Boolean(token),
  });

  const service = useMemo(
    () => services.data?.find((item) => item.id === booking.data?.service_id) ?? null,
    [services.data, booking.data?.service_id],
  );

  const isClient = user?.id === booking.data?.client_id;
  const isVendor = Boolean(user?.roles.includes('ROLE_VENDOR')) && service?.vendor_user_id === user?.id;

  const counterpartId = isClient ? service?.vendor_user_id ?? null : booking.data?.client_id ?? null;

  const relatedMessages = useMemo(() => {
    if (!messages.data || !user?.id || !counterpartId) {
      return [];
    }

    return messages.data.filter(
      (message) =>
        (message.senderId === user.id && message.receiverId === counterpartId) ||
        (message.senderId === counterpartId && message.receiverId === user.id),
    );
  }, [messages.data, user, counterpartId]);

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
        message: 'Escrow created. This booking is now ready to move into protected payment collection.',
      });
      await queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] });
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

      return apiClient.createCollection(token, booking.data.escrow.id, values.msisdn, values.provider.toUpperCase());
    },
    onSuccess: async (response) => {
      setFeedback(`Collection session created for ${response.escrow_reference}`);
      setInlineSuccess({
        scope: 'collection',
        message: 'Collection started. Keep this workspace open while the booking moves into protected delivery.',
      });
      setShowCollectionForm(false);
      collectionForm.reset({ msisdn: '', provider: 'MPESA' });
      await queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] });
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
      await queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] });
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to release escrow');
    },
  });

  const disputeEscrow = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.disputeBookingEscrow(token, bookingId, 'Client requested admin review from booking workspace');
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'dispute',
        message: 'Dispute opened. Keep any follow-up in this booking tied to delivery facts and evidence.',
      });
      await queryClient.invalidateQueries({ queryKey: ['booking-workspace', token, bookingId] });
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to dispute escrow');
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (values: MessageFormValues) => {
      if (!token || !counterpartId) {
        throw new Error('Counterparty missing for this booking');
      }

      return apiClient.sendMessage(token, {
        receiverId: counterpartId,
        content: values.content,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'message',
        message: 'Booking message sent. The latest update is now attached to this work item.',
      });
      messageForm.reset({ content: '' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-workspace-messages', token] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-messages'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-notifications'] }),
      ]);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to send message');
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

  const nextStep = !booking.data?.escrow
    ? 'Create escrow before trying to collect payment or confirm delivery.'
    : booking.data.escrow.status === 'CREATED'
      ? 'Start payment collection so the booking can move into a protected delivery state.'
      : booking.data.escrow.status === 'ACTIVE'
        ? 'Use messages to clarify work, then release payment or open a dispute when the outcome is clear.'
        : booking.data.escrow.status === 'DISPUTED'
          ? 'Wait for admin review and keep the booking communication focused on evidence and delivery facts.'
          : 'Review the current booking record and move back to the dashboard if no further action is needed.';
  const collectionReady = Boolean(watchedCollectionMsisdn.trim() && watchedCollectionProvider.trim());
  const messageReady = Boolean(watchedMessageContent.trim().length >= 8);
  const collectionErrors = getFormErrorMessages(collectionForm.formState.errors as Record<string, unknown>);
  const messageErrors = getFormErrorMessages(messageForm.formState.errors as Record<string, unknown>);
  const bookingPriority = !booking.data
    ? {
        title: 'Booking context is loading',
        description: 'Stay on this page for a moment so the latest booking, escrow, and message state can settle before you choose the next action.',
        tone: 'guidance' as const,
      }
    : !booking.data.escrow
      ? {
          title: 'This booking needs escrow before anything else',
          description: 'Create escrow first so the work can move into protected payment flow before delivery or release decisions begin.',
          tone: 'finance' as const,
        }
      : booking.data.escrow.status === 'CREATED'
        ? {
            title: 'Payment collection is the next safe move',
            description: 'Escrow already exists, so the next clean action is to start collection and move this booking into protected delivery.',
            tone: 'finance' as const,
          }
        : booking.data.escrow.status === 'ACTIVE'
          ? {
              title: 'Live delivery should be reviewed before settlement',
              description: 'Use the timeline and thread to confirm the work state, then release or dispute only when the outcome is genuinely clear.',
              tone: 'activity' as const,
            }
          : booking.data.escrow.status === 'DISPUTED'
            ? {
                title: 'This booking is in formal dispute review',
                description: 'Keep any follow-up attached to facts and evidence while you wait for the next operations decision.',
                tone: 'risk' as const,
              }
            : {
                title: 'The booking is close to clean closure',
                description: 'Review the final record, confirm no more conversation is needed, then return to the broader lane for the next task.',
                tone: 'guidance' as const,
              };

  useEffect(() => {
    const hasUnsavedDrafts =
      (showCollectionForm && collectionForm.formState.isDirty) ||
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
  }, [collectionForm.formState.isDirty, messageForm.formState.isDirty, showCollectionForm]);

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
      title="Booking workspace"
      subtitle="This page keeps one booking’s payment state, collaboration thread, and operational next steps in a single place."
      mobileQuickActions={
        <div className="grid grid-cols-3 gap-2">
          <Link href="#booking-timeline-section">
            <Button size="sm" variant="ghost" className="w-full">Timeline</Button>
          </Link>
          <Link href="#booking-controls-section">
            <Button size="sm" className="w-full">Controls</Button>
          </Link>
          <Link href="#booking-thread-section">
            <Button size="sm" variant="ghost" className="w-full">Thread</Button>
          </Link>
        </div>
      }
    >
      <WorkspaceGuide
        eyebrow="How to use this booking"
        title="Everything for this booking lives on this page"
        description="You do not need to jump between multiple screens for one booking. Use this workspace to understand status, protect or release payment, and keep the conversation attached to the same work item."
        points={[
          'Check the timeline first to understand the current state before pressing any action button.',
          'Use payment controls only when the escrow status clearly allows that next step.',
          'Keep booking messages focused on delivery facts, scope, or clarification.',
          'If the booking no longer needs action, return to the wider dashboard and continue from there.',
        ]}
        tip={nextStep}
      />

      <div className="mt-6">
        <WorkflowSteps
          eyebrow="Typical booking path"
          title="The normal sequence for one booking"
          steps={[
            { title: 'Review status', description: 'Use the timeline and control summary to understand the exact booking state.' },
            { title: 'Protect payment', description: 'Create escrow and collect payment only when the booking is ready to proceed.' },
            { title: 'Coordinate delivery', description: 'Use the booking conversation to keep requests and updates attached to the work.' },
            { title: 'Close cleanly', description: 'Release payment when satisfied or open a dispute if the booking needs formal review.' },
          ]}
        />
      </div>

      <SectionNavigator
        className="mt-6"
        title="Jump to the exact booking section"
        description="Use these anchors when you need timeline context, payment control, or the booking thread without extra scrolling."
        items={[
          { href: '#booking-timeline-section', label: 'Timeline', helper: 'Read the current story first.' },
          { href: '#booking-controls-section', label: 'Controls', helper: 'Handle escrow and settlement safely.' },
          { href: '#booking-thread-section', label: 'Thread', helper: 'Review or continue the conversation.' },
          { href: '#booking-message-section', label: 'Message desk', helper: 'Send the next booking-specific update.' },
        ]}
      />

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '90ms' }}>
        <PriorityBanner
          title={bookingPriority.title}
          description={bookingPriority.description}
          tone={bookingPriority.tone}
          actions={
            <>
              <Button
                size="sm"
                variant={booking.data?.escrow?.status === 'CREATED' || !booking.data?.escrow ? 'primary' : 'ghost'}
                onClick={() => jumpToBookingSection('booking-controls-section')}
              >
                Open controls
              </Button>
              <Button
                size="sm"
                variant={booking.data?.escrow?.status === 'ACTIVE' ? 'primary' : 'ghost'}
                onClick={() => jumpToBookingSection('booking-timeline-section')}
              >
                Review timeline
              </Button>
              {counterpartId ? (
                <Button
                  size="sm"
                  variant={booking.data?.escrow?.status === 'DISPUTED' ? 'primary' : 'ghost'}
                  onClick={() => jumpToBookingSection('booking-thread-section')}
                >
                  Open thread
                </Button>
              ) : null}
              <Link href={isVendor ? '/dashboard/vendor' : '/dashboard/client'}>
                <Button size="sm" variant="ghost">
                  Return to lane
                </Button>
              </Link>
            </>
          }
        />
      </div>

      <div className="mb-6">
        <Link href={isVendor ? '/dashboard/vendor' : '/dashboard/client'} className="inline-flex">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 size-4" />
            Back to dashboard
          </Button>
        </Link>
      </div>

      <Card variant="guidance" className="mb-6">
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/communications">
            <Button variant="ghost" size="sm">Open inbox</Button>
          </Link>
          <Link href="/dashboard/notifications">
            <Button variant="ghost" size="sm">View alerts</Button>
          </Link>
          <Link href={isVendor ? '/dashboard/vendor' : '/dashboard/client'}>
            <Button variant="ghost" size="sm">Return to lane</Button>
          </Link>
        </div>
      </Card>

      {booking.data ? (
        <ActionSummaryStrip
          className="mb-6"
          title="What matters on this booking right now"
          items={[
            {
              eyebrow: 'Current state',
              value: booking.data.escrow?.status ?? 'No escrow',
              detail: booking.data.escrow ? `Booking ${booking.data.status} with ${booking.data.escrow.amount_minor} ${booking.data.escrow.currency} protected in escrow.` : 'This booking has not entered protected payment flow yet.',
              icon: <WalletCards className="size-5" />,
              tone: 'finance',
            },
            {
              eyebrow: 'Next safe move',
              value: !booking.data.escrow ? 'Create escrow' : booking.data.escrow.status === 'CREATED' ? 'Collect payment' : booking.data.escrow.status === 'ACTIVE' ? 'Release or dispute' : booking.data.escrow.status === 'DISPUTED' ? 'Wait for review' : 'Review outcome',
              detail: nextStep,
              icon: <CircleDollarSign className="size-5" />,
              tone: 'activity',
            },
            {
              eyebrow: 'Continue here',
              value: counterpartId ? 'Booking thread' : 'Return to lane',
              detail: counterpartId ? 'Use the conversation panel below when the next move depends on clarification with the other party.' : 'Use the quick chips above to continue from the broader workspace.',
              icon: <MessagesSquare className="size-5" />,
              tone: 'guidance',
            },
          ]}
        />
      ) : null}

      {feedback ? <div className="mb-6"><FeedbackBanner message={feedback} tone="info" onDismiss={() => setFeedback(null)} /></div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card id="booking-timeline-section" variant="activity" className="scroll-mt-24">
          {booking.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-1/2" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : null}
          {booking.isError ? (
            <FeedbackBanner
              message={booking.error instanceof Error ? booking.error.message : 'Unable to load booking'}
              tone="danger"
            />
          ) : null}
          {booking.data ? (
            <BookingTimeline booking={booking.data} perspective={isVendor ? 'vendor' : 'client'} />
          ) : null}
        </Card>

        <Card id="booking-controls-section" variant="finance" className="scroll-mt-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#c9d5ff]">Operational controls</p>
              <h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)] drop-shadow-[0_16px_30px_rgba(47,107,255,0.16)]">Settlement and next action</h2>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.06)] text-[#c9d5ff]">
              <CircleDollarSign className="size-5" />
            </div>
          </div>
          {booking.data ? (
            <div className="mt-5 space-y-4 text-sm text-[var(--text-secondary)]">
              <div className="rounded-[22px] border border-[rgba(123,165,255,0.2)] bg-[linear-gradient(180deg,rgba(12,35,91,0.66),rgba(18,64,134,0.42))] p-4 transition duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Booking</p>
                <p className="mt-2 text-[var(--text-primary)]">{booking.data.service_title}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge label={booking.data.status} tone={getBookingStatusTone(booking.data.status)} />
                </div>
              </div>
              <div className="rounded-[22px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.66),rgba(32,47,132,0.42))] p-4 transition duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Escrow state</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={booking.data.escrow?.status ?? 'Not created'}
                    tone={booking.data.escrow ? getEscrowStatusTone(booking.data.escrow.status) : 'warning'}
                  />
                </div>
                <p className="mt-2">{booking.data.escrow ? `${booking.data.escrow.amount_minor} ${booking.data.escrow.currency}` : 'Create escrow to protect payment.'}</p>
              </div>
              <BookingProgressStrip booking={booking.data} />
              <div className="flex flex-wrap gap-3">
                {isClient && !booking.data.escrow ? (
                  <Button onClick={() => createEscrow.mutate()} disabled={createEscrow.isPending}>
                    {createEscrow.isPending ? 'Creating escrow...' : 'Create escrow'}
                  </Button>
                ) : null}
                {isClient && booking.data.escrow?.status === 'CREATED' ? (
                  <Button onClick={() => setShowCollectionForm((value) => !value)}>
                    {showCollectionForm ? 'Hide payment form' : 'Collect payment'}
                  </Button>
                ) : null}
                {isClient && booking.data.escrow?.status === 'ACTIVE' ? (
                  <>
                    <Button onClick={() => releaseEscrow.mutate()} disabled={releaseEscrow.isPending}>
                      {releaseEscrow.isPending ? 'Releasing...' : 'Release escrow'}
                    </Button>
                    <Button variant="ghost" onClick={() => disputeEscrow.mutate()} disabled={disputeEscrow.isPending}>
                      {disputeEscrow.isPending ? 'Opening dispute...' : 'Open dispute'}
                    </Button>
                  </>
                ) : null}
              </div>
              {inlineSuccess && inlineSuccess.scope !== 'message' ? (
                <InlineStateNote tone="success" message={inlineSuccess.message} />
              ) : null}

              {showCollectionForm && isClient && booking.data.escrow?.status === 'CREATED' ? (
                <form className="grid gap-4 rounded-[20px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.62),rgba(32,47,132,0.4))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" onSubmit={handleCollectionSubmit}>
                  <DraftStatusNote
                    dirty={collectionForm.formState.isDirty}
                    isSaving={collectPayment.isPending}
                    pristineMessage="No unsaved payment collection details are waiting in this booking."
                    dirtyMessage="This payment request has unsaved details. Submit only when the wallet and provider are confirmed."
                    savingMessage="Starting the payment collection request..."
                  />
                  <div id="booking-collection-summary">
                    <FormValidationSummary
                      title="The payment collection request still needs a few corrections"
                      errors={collectionErrors}
                    />
                  </div>
                  <FormSection
                    step="01"
                    title="Payment destination"
                    description="Set the wallet and provider that should receive the payment prompt for this booking."
                    tone="finance"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-[var(--text-secondary)]" htmlFor="workspace-msisdn">MSISDN</label>
                        <input id="workspace-msisdn" placeholder="2557XXXXXXXX" {...collectionForm.register('msisdn')} />
                        <FormHint text="Enter the wallet number that should receive the payment prompt for this booking." />
                        {collectionForm.formState.errors.msisdn ? <p className="text-sm text-rose-300">{collectionForm.formState.errors.msisdn.message}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[var(--text-secondary)]" htmlFor="workspace-provider">Provider</label>
                        <select id="workspace-provider" {...collectionForm.register('provider')}>
                          <option value="MPESA">M-Pesa</option>
                          <option value="AIRTEL">Airtel Money</option>
                          <option value="YAS">YAS</option>
                        </select>
                        <FormHint text="Choose the same mobile-money network linked to that number so collection can route cleanly." />
                        {collectionForm.formState.errors.provider ? <p className="text-sm text-rose-300">{collectionForm.formState.errors.provider.message}</p> : null}
                      </div>
                    </div>
                  </FormSection>
                  {collectionReady ? <InlineStateNote tone="success" message="The payment request is ready to route to the selected wallet." /> : null}
                  <FormActionDock
                    title="Collection actions"
                    hint="Submit only after the wallet number and provider clearly match the intended payment destination."
                  >
                    <Button type="submit" disabled={collectPayment.isPending}>
                      {collectPayment.isPending ? 'Starting collection...' : 'Start collection'}
                    </Button>
                  </FormActionDock>
                </form>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card id="booking-thread-section" variant="communication" className="scroll-mt-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#9fdfff]">Booking thread</p>
              <h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)] drop-shadow-[0_16px_30px_rgba(78,137,255,0.14)]">Conversation</h2>
            </div>
            <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {relatedMessages.length} messages
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {messages.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : null}
            {relatedMessages.map((message) => {
              const outgoing = message.senderId === user?.id;

              return (
                <div key={message.id} className="rounded-[22px] border border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.62),rgba(15,63,120,0.42))] p-4 transition duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                        {outgoing ? 'Outgoing' : 'Incoming'} · {message.createdAt}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge label={outgoing ? 'sent' : 'received'} tone={outgoing ? 'info' : 'warning'} />
                        <StatusBadge label="booking thread" tone="neutral" />
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-primary)]">{message.content}</p>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--panel-muted)] text-[var(--brand-secondary)]">
                      <MessagesSquare className="size-4" />
                    </div>
                  </div>
                </div>
              );
            })}
            {messages.isError ? (
              <FeedbackBanner
                message={messages.error instanceof Error ? messages.error.message : 'Unable to load booking messages'}
                tone="danger"
              />
            ) : null}
            {!messages.isLoading && !relatedMessages.length ? (
              <EmptyState
                icon={<MessagesSquare className="size-5" />}
                title="No booking messages yet"
                description="This booking has no conversation trail yet. Use the message desk below when the next step depends on clarification, progress notes, or delivery evidence tied to this work item."
                action={
                  <Button
                    variant="ghost"
                    onClick={() => jumpToBookingSection('booking-message-section')}
                  >
                    Open message desk
                  </Button>
                }
              />
            ) : null}
          </div>
        </Card>

        <Card id="booking-message-section" variant="guidance" className="scroll-mt-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#d5e3ff]">Direct collaboration</p>
              <h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)] drop-shadow-[0_16px_30px_rgba(47,107,255,0.16)]">Message counterpart</h2>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.06)] text-[#d5e3ff]">
              {booking.data?.escrow ? <WalletCards className="size-4" /> : <Layers3 className="size-4" />}
            </div>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={handleMessageSubmit}>
            <DraftStatusNote
              dirty={messageForm.formState.isDirty}
              isSaving={sendMessage.isPending}
              pristineMessage="No unsaved booking update is waiting here."
              dirtyMessage="This booking update has unsaved text. Send it only when the note is specific enough to move the work forward."
              savingMessage="Sending the booking update..."
            />
            <div id="booking-message-summary">
              <FormValidationSummary
                title="The booking message still needs a few corrections"
                errors={messageErrors}
              />
            </div>
            <FormSection
              step="01"
              title="Send one booking-specific update"
              description="Keep the thread tied to delivery facts, open questions, or the next concrete action on this booking."
              tone="activity"
            >
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]" htmlFor="workspace-message-content">Message</label>
                <textarea
                  id="workspace-message-content"
                  rows={6}
                  placeholder={isVendor ? 'Share progress, delivery notes, or clarify scope.' : 'Ask a question, confirm delivery, or align on the next step.'}
                  {...messageForm.register('content')}
                />
                <FormHint text="Keep each message tied to this booking so decisions, delivery notes, and clarifications stay easy to trace later." />
                {messageForm.formState.errors.content ? <p className="text-sm text-rose-300">{messageForm.formState.errors.content.message}</p> : null}
              </div>
            </FormSection>
            {messageReady ? <InlineStateNote tone="success" message="This update is already specific enough to keep the booking record useful." /> : null}
            {inlineSuccess?.scope === 'message' ? <InlineStateNote tone="success" message={inlineSuccess.message} /> : null}
            <FormActionDock
              title="Message actions"
              hint="Send only when the message clearly states the delivery update, clarification, or next step for this booking."
            >
              <Button type="submit" disabled={sendMessage.isPending || !counterpartId}>
                {sendMessage.isPending ? 'Sending...' : isVendor ? 'Send to client' : 'Send to vendor'}
              </Button>
            </FormActionDock>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}
