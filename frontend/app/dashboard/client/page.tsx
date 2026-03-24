'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleDollarSign, SearchX, ShieldAlert, TimerReset } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { ServiceCategoryBadge } from '@/components/dashboard/service-category-badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { BookingProgressStrip } from '@/components/dashboard/booking-progress-strip';
import { BookingTimeline } from '@/components/dashboard/booking-timeline';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ActionSummaryStrip } from '@/components/ui/action-summary-strip';
import { DraftStatusNote } from '@/components/ui/draft-status-note';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { FirstSessionState } from '@/components/ui/first-session-state';
import { FormActionDock } from '@/components/ui/form-action-dock';
import { FormSection } from '@/components/ui/form-section';
import { FormHint } from '@/components/ui/form-hint';
import { FormValidationSummary } from '@/components/ui/form-validation-summary';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { NextActionHint } from '@/components/ui/next-action-hint';
import { PulseMetricsStrip } from '@/components/ui/pulse-metrics-strip';
import { PriorityBanner } from '@/components/ui/priority-banner';
import { SectionHeader } from '@/components/ui/section-header';
import { SectionNavigator } from '@/components/ui/section-navigator';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkflowSteps } from '@/components/ui/workflow-steps';
import { WorkspaceIdentityBanner } from '@/components/ui/workspace-identity-banner';
import { WorkspaceGuide } from '@/components/ui/workspace-guide';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { wolfixMarketplaceLanes, wolfixServiceCategories } from '@/lib/marketplace';
import { getBookingStatusTone, getEscrowStatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';

const collectionSchema = z.object({
  msisdn: z.string().min(8, 'Phone number is required'),
  provider: z.string().min(2, 'Provider is required'),
});
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1200).optional().or(z.literal('')),
});
const messageSchema = z.object({
  content: z.string().min(2, 'Message is too short').max(2000, 'Message is too long'),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;
type ReviewFormValues = z.infer<typeof reviewSchema>;
type MessageFormValues = z.infer<typeof messageSchema>;

function getClientBookingNextStep(booking: { status: string; escrow?: { status: string } | null }): string {
  if (!booking.escrow) {
    return 'Create escrow so this booking can move into protected payment flow.';
  }

  switch (booking.escrow.status) {
    case 'CREATED':
      return 'Start payment collection so the booking can move into active delivery.';
    case 'ACTIVE':
      return 'Track delivery, message the provider if needed, then release or dispute.';
    case 'DISPUTED':
      return 'Wait for admin review and keep any follow-up tied to delivery facts.';
    case 'RELEASED':
      return booking.status === 'completed' ? 'Leave a review if the service is fully complete.' : 'Review the final booking outcome.';
    default:
      return 'Open the booking workspace to confirm the exact next action.';
  }
}

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

export default function ClientDashboardPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inlineSuccess, setInlineSuccess] = useState<{ scope: 'catalog' | 'escrow' | 'collection' | 'review' | 'message'; bookingId?: number; message: string } | null>(null);
  const [activeEscrowId, setActiveEscrowId] = useState<number | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [messageBookingId, setMessageBookingId] = useState<number | null>(null);
  const [collectionGatewayPreview, setCollectionGatewayPreview] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const collectionForm = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      msisdn: '',
      provider: 'MPESA',
    },
  });
  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
      comment: '',
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
  const watchedReviewRating = useWatch({ control: reviewForm.control, name: 'rating' });
  const watchedReviewComment = useWatch({ control: reviewForm.control, name: 'comment' }) ?? '';
  const watchedMessageContent = useWatch({ control: messageForm.control, name: 'content' }) ?? '';

  const services = useQuery({
    queryKey: ['client-services', token],
    queryFn: () => apiClient.getServices(token),
  });

  const bookings = useQuery({
    queryKey: ['client-bookings', token],
    queryFn: () => apiClient.getBookings(token ?? ''),
    enabled: Boolean(token),
  });

  const createBooking = useMutation({
    mutationFn: async (serviceId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.createBooking(token, serviceId);
    },
    onSuccess: async (response) => {
      setFeedback(`Booking created: #${response.booking_id}`);
      setInlineSuccess({
        scope: 'catalog',
        message: 'Booking created. Continue in the bookings rail below when you are ready to protect payment.',
      });
      await queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to create booking');
    },
  });
  const createEscrow = useMutation({
    mutationFn: async (bookingId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.createBookingEscrow(token, bookingId);
    },
    onSuccess: async (response, bookingId) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'escrow',
        bookingId,
        message: 'Escrow created. This booking can now move into protected payment collection.',
      });
      await queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to create escrow');
    },
  });
  const collectPayment = useMutation({
    mutationFn: async (values: CollectionFormValues) => {
      if (!token || !activeEscrowId) {
        throw new Error('Escrow selection missing');
      }

      return apiClient.createCollection(token, activeEscrowId, values.msisdn, values.provider.toUpperCase());
    },
    onSuccess: (response) => {
      setFeedback(`Collection session created for ${response.escrow_reference}`);
      if (activeBookingId !== null) {
        setInlineSuccess({
          scope: 'collection',
          bookingId: activeBookingId,
          message: 'Collection started. Watch the latest payment session and continue tracking delivery from this booking.',
        });
      }
      setCollectionGatewayPreview(JSON.stringify(response.gateway, null, 2));
      collectionForm.reset({
        msisdn: '',
        provider: 'MPESA',
      });
      setActiveEscrowId(null);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to initiate collection');
    },
  });
  const releaseEscrow = useMutation({
    mutationFn: async (bookingId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.releaseBookingEscrow(token, bookingId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to release escrow');
    },
  });
  const disputeEscrow = useMutation({
    mutationFn: async (bookingId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.disputeBookingEscrow(token, bookingId, 'Client requested admin review from dashboard');
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to dispute escrow');
    },
  });
  const createReview = useMutation({
    mutationFn: async (values: ReviewFormValues) => {
      if (!token || !reviewBookingId) {
        throw new Error('Review target missing');
      }

      return apiClient.createReview(token, {
        bookingId: reviewBookingId,
        rating: values.rating,
        comment: values.comment || null,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      if (reviewBookingId !== null) {
        setInlineSuccess({
          scope: 'review',
          bookingId: reviewBookingId,
          message: 'Review saved. Future buyers can now understand the delivery outcome more clearly.',
        });
      }
      setReviewBookingId(null);
      reviewForm.reset({
        rating: 5,
        comment: '',
      });
      await queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to submit review');
    },
  });
  const sendMessage = useMutation({
    mutationFn: async (values: MessageFormValues) => {
      if (!token || !messageBookingId) {
        throw new Error('Booking conversation target missing');
      }

      const booking = bookings.data?.find((item) => item.id === messageBookingId);
      const service = services.data?.find((item) => item.id === booking?.service_id);
      const receiverId = service?.vendor_user_id;

      if (!booking || !receiverId) {
        throw new Error('Unable to resolve vendor recipient for this booking');
      }

      return apiClient.sendMessage(token, {
        receiverId,
        content: values.content,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      if (messageBookingId !== null) {
        setInlineSuccess({
          scope: 'message',
          bookingId: messageBookingId,
          message: 'Message sent. The booking thread now carries the latest update for this work item.',
        });
      }
      setMessageBookingId(null);
      messageForm.reset({
        content: '',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['messages-page'] }),
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
    if (activeBookingId !== null) {
      scrollToValidationSummary(`client-collection-summary-${activeBookingId}`);
    }
  });
  const handleReviewSubmit = reviewForm.handleSubmit(async (values) => {
    setFeedback(null);
    await createReview.mutateAsync(values);
  }, async () => {
    if (reviewBookingId !== null) {
      scrollToValidationSummary(`client-review-summary-${reviewBookingId}`);
    }
  });
  const handleMessageSubmit = messageForm.handleSubmit(async (values) => {
    setFeedback(null);
    await sendMessage.mutateAsync(values);
  }, async () => {
    if (messageBookingId !== null) {
      scrollToValidationSummary(`client-message-summary-${messageBookingId}`);
    }
  });

  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();

    return (services.data ?? []).filter((service) => {
      const matchesCategory = activeCategory === 'All' || (service.category ?? '') === activeCategory;
      const searchable = `${service.title} ${service.description ?? ''} ${service.category ?? ''}`.toLowerCase();
      const matchesSearch = query.length === 0 || searchable.includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, serviceSearch, services.data]);
  const trackedBookings = bookings.data?.filter((booking) => booking.escrow).length ?? 0;
  const activeDeliveries = bookings.data?.filter((booking) => booking.escrow?.status === 'ACTIVE').length ?? 0;
  const pendingCollectionCount = bookings.data?.filter((booking) => booking.escrow?.status === 'CREATED').length ?? 0;
  const disputedBookingCount = bookings.data?.filter((booking) => booking.escrow?.status === 'DISPUTED').length ?? 0;
  const categoryResultsCount = filteredServices.length;
  const hasActiveCatalogFilters = activeCategory !== 'All' || serviceSearch.trim().length > 0;
  const isClientFirstSession =
    !bookings.isLoading &&
    !bookings.isError &&
    !services.isLoading &&
    !services.isError &&
    (bookings.data?.length ?? 0) === 0;
  const catalogStateMessage = serviceSearch.trim().length > 0
    ? activeCategory === 'All'
      ? `Showing ${categoryResultsCount} service result${categoryResultsCount === 1 ? '' : 's'} for "${serviceSearch.trim()}".`
      : `Showing ${categoryResultsCount} service result${categoryResultsCount === 1 ? '' : 's'} in ${activeCategory} for "${serviceSearch.trim()}".`
    : activeCategory === 'All'
      ? `Showing all ${categoryResultsCount} service result${categoryResultsCount === 1 ? '' : 's'} in the marketplace catalog.`
      : `Showing ${categoryResultsCount} service result${categoryResultsCount === 1 ? '' : 's'} in ${activeCategory}.`;
  const collectionReady = Boolean(watchedCollectionMsisdn.trim() && watchedCollectionProvider.trim());
  const reviewReady = Boolean(Number(watchedReviewRating) > 0 && watchedReviewComment.trim().length >= 20);
  const messageReady = Boolean(watchedMessageContent.trim().length >= 8);
  const collectionErrors = getFormErrorMessages(collectionForm.formState.errors as Record<string, unknown>);
  const reviewErrors = getFormErrorMessages(reviewForm.formState.errors as Record<string, unknown>);
  const messageErrors = getFormErrorMessages(messageForm.formState.errors as Record<string, unknown>);
  const clientPriority = disputedBookingCount
    ? {
        title: 'A disputed booking needs calm follow-up first',
        description: 'Start in the bookings rail, review the affected work item, and keep any new messages tied to delivery facts while admin review continues.',
        tone: 'risk' as const,
      }
    : pendingCollectionCount
      ? {
          title: 'Protected payment is waiting for the next step',
          description: 'At least one booking already has escrow but still needs collection to move fully into protected delivery.',
          tone: 'finance' as const,
        }
      : activeDeliveries
        ? {
            title: 'Live delivery deserves attention before new work',
            description: 'Open the bookings rail first, confirm progress on active work, then release or escalate only when delivery is clear.',
            tone: 'activity' as const,
          }
        : trackedBookings
          ? {
              title: 'Existing bookings are ready for review',
              description: 'Use the bookings rail first so you can see whether escrow, delivery, or review action is waiting before browsing again.',
              tone: 'guidance' as const,
            }
          : {
              title: 'You are clear to start a new booking',
              description: 'Browse the service catalog, narrow the category you want, then create a booking from the offer that matches your need most cleanly.',
              tone: 'market' as const,
            };

  useEffect(() => {
    const hasUnsavedDrafts =
      (activeEscrowId !== null && collectionForm.formState.isDirty) ||
      (reviewBookingId !== null && reviewForm.formState.isDirty) ||
      (messageBookingId !== null && messageForm.formState.isDirty);

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
    activeEscrowId,
    collectionForm.formState.isDirty,
    messageBookingId,
    messageForm.formState.isDirty,
    reviewBookingId,
    reviewForm.formState.isDirty,
  ]);

  const scrollToValidationSummary = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const jumpToClientSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <DashboardShell
      title="Bookings workspace"
      subtitle="Explore services, place bookings, track progress, and manage delivery from one secure WOLFIX workspace."
      mobileQuickActions={
        <div className="grid grid-cols-3 gap-2">
          <Link href="#client-service-catalog">
            <Button size="sm" variant="ghost" className="w-full">Catalog</Button>
          </Link>
          <Link href="#client-bookings-rail">
            <Button size="sm" className="w-full">Bookings</Button>
          </Link>
          <Link href="#client-activity-timeline">
            <Button size="sm" variant="ghost" className="w-full">Timeline</Button>
          </Link>
        </div>
      }
    >
      <div className="animate-fade-up">
        <WorkspaceGuide
          eyebrow="How to use bookings"
          title="This page is for choosing, booking, paying, and confirming work"
          description="If you are new here, move in order: find a service, create a booking, protect the payment, then track delivery until you can release or escalate."
          points={[
            'Use the service catalog when you need to start new work.',
            'Use the booking cards when work already exists and needs action.',
            'Only create payment collection after escrow exists for that booking.',
            'Use review and message actions after delivery progress becomes clear.',
          ]}
          tip="If you are unsure what to do next, look at the booking status first. The next safe action is usually attached to that booking."
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '20ms' }}>
        <WorkspaceIdentityBanner
          tone="client"
          title="This workspace is built for buying, protecting payment, and closing delivery cleanly"
          description="Everything here is arranged around the client journey: compare offers, open one booking, protect the payment through escrow, then confirm delivery only when the work is truly complete."
          highlights={[
            'Start from the catalog when no work exists yet.',
            'Move into the bookings rail when escrow or delivery needs action.',
            'Use reviews and messages only after the work context is clear.',
          ]}
          actions={
            <>
              <Button size="sm" onClick={() => jumpToClientSection('client-service-catalog')}>
                Explore services
              </Button>
              <Button size="sm" variant="ghost" onClick={() => jumpToClientSection('client-bookings-rail')}>
                Open active bookings
              </Button>
            </>
          }
        />
      </div>

      {isClientFirstSession ? (
        <FirstSessionState
          title="Your first booking can start from this page"
          description="You do not have tracked work yet, so the cleanest first move is to browse one clear service, create the booking, then return to the bookings rail when protected payment is ready."
          steps={[
            {
              label: 'Start from the service catalog',
              detail: 'Use the catalog below to compare offers before opening any work item.',
              href: '#client-service-catalog',
            },
            {
              label: 'Choose one service lane',
              detail: 'If you already know the kind of help you need, jump straight into that category instead of scanning everything.',
              href: '#client-service-catalog',
            },
            {
              label: 'Create the first tracked booking',
              detail: 'Once the booking exists, this page becomes your main place for escrow, delivery, and follow-up.',
              href: '#client-bookings-rail',
            },
          ]}
          actions={
            <>
              <Button size="sm" onClick={() => jumpToClientSection('client-service-catalog')}>
                Browse catalog
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setActiveCategory('Government Consultancy Services');
                  jumpToClientSection('client-service-catalog');
                }}
              >
                Open government consultancy
              </Button>
            </>
          }
        />
      ) : null}

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '40ms' }}>
        <WorkflowSteps
          eyebrow="Typical client path"
          title="Start and finish a booking without getting lost"
          steps={[
            { title: 'Pick a service', description: 'Search the catalog and choose the service that matches your need.' },
            { title: 'Create booking', description: 'Open the work formally so progress, communication, and payment can be tracked.' },
            { title: 'Protect payment', description: 'Create escrow and start collection only when you are ready to proceed.' },
            { title: 'Track and confirm', description: 'Follow delivery progress, send messages, then release payment or open a dispute if needed.' },
          ]}
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '80ms' }}>
        <SectionNavigator
          className="mt-6"
          title="Jump to the right part of the bookings page"
          description="Use these anchors when you already know whether you need new work, live booking action, or activity review."
          items={[
            { href: '#client-quick-actions', label: 'Quick actions', helper: 'See the current pulse first.' },
            { href: '#client-service-catalog', label: 'Service catalog', helper: 'Search and compare new offers.' },
            { href: '#client-bookings-rail', label: 'Bookings rail', helper: 'Continue active work and escrow steps.' },
            { href: '#client-activity-timeline', label: 'Activity timeline', helper: 'Review the story of recent work.' },
          ]}
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '120ms' }}>
        <PriorityBanner
          title={clientPriority.title}
          description={clientPriority.description}
          tone={clientPriority.tone}
          actions={
            <>
              <Button
                size="sm"
                variant={disputedBookingCount || pendingCollectionCount || activeDeliveries || trackedBookings ? 'primary' : 'ghost'}
                onClick={() => jumpToClientSection('client-bookings-rail')}
              >
                Open bookings rail
              </Button>
              <Button
                size="sm"
                variant={!trackedBookings ? 'primary' : 'ghost'}
                onClick={() => jumpToClientSection('client-service-catalog')}
              >
                Browse services
              </Button>
              <Button
                size="sm"
                variant={activeCategory === 'Government Consultancy Services' ? 'primary' : 'ghost'}
                onClick={() => {
                  setInlineSuccess(null);
                  setActiveCategory('Government Consultancy Services');
                  setServiceSearch('');
                  jumpToClientSection('client-service-catalog');
                }}
              >
                Government consultancy
              </Button>
              <Button
                size="sm"
                variant={disputedBookingCount ? 'primary' : 'ghost'}
                onClick={() => jumpToClientSection('client-activity-timeline')}
              >
                Review activity
              </Button>
            </>
          }
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '150ms' }}>
        <ActionSummaryStrip
          className="mt-6"
          title="What matters in your bookings workspace right now"
          items={[
            {
              eyebrow: 'Current state',
              value: trackedBookings ? `${trackedBookings} tracked` : 'No tracked work',
              detail: trackedBookings
                ? `${activeDeliveries} booking${activeDeliveries === 1 ? '' : 's'} already protected and moving through delivery.`
                : 'No booking has entered protected payment flow yet.',
              icon: <CircleDollarSign className="size-5" />,
              tone: 'finance',
            },
            {
              eyebrow: 'Next safe move',
              value: activeDeliveries
                ? 'Track live delivery'
                : categoryResultsCount
                  ? 'Pick a service'
                  : 'Reset filters',
              detail: activeDeliveries
                ? 'Open the bookings rail below to review progress, release payment, or escalate only when delivery is clear.'
                : categoryResultsCount
                  ? 'Use the catalog below to compare offers and create the next booking from a service that fits cleanly.'
                  : 'Clear the current search or category filter so the catalog opens up again.',
              icon: <ShieldAlert className="size-5" />,
              tone: 'activity',
            },
            {
              eyebrow: 'Continue here',
              value: trackedBookings ? 'Bookings rail' : 'Service catalog',
              detail: trackedBookings
                ? 'Jump straight into the bookings rail when existing work already needs escrow or delivery action.'
                : 'Start in the service catalog when you are opening new work for the first time.',
              icon: <TimerReset className="size-5" />,
              tone: 'guidance',
            },
          ]}
        />
      </div>

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '160ms' }}>
        <PulseMetricsStrip
          title="Read the bookings pulse before you dive deeper"
          description="This strip gives you the quickest summary of what is open in the catalog and what is already moving through protected work."
          items={[
            {
              label: 'Catalog in view',
              value: String(categoryResultsCount),
              detail: hasActiveCatalogFilters ? 'Current search and category filters are shaping this service view.' : 'You are looking at the full service catalog right now.',
              icon: <SearchX className="size-5" />,
              variant: 'market',
            },
            {
              label: 'Tracked work',
              value: String(trackedBookings),
              detail: trackedBookings ? 'These bookings already carry escrow context and operational next steps.' : 'No booking has entered the protected flow yet.',
              icon: <CircleDollarSign className="size-5" />,
              variant: 'finance',
            },
            {
              label: 'Live delivery',
              value: String(activeDeliveries),
              detail: activeDeliveries ? 'These bookings are active and deserve the next delivery or release review.' : 'No booking is currently in active protected delivery.',
              icon: <TimerReset className="size-5" />,
              variant: 'activity',
            },
          ]}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard eyebrow="Escrow posture" value={bookings.data?.some((booking) => booking.escrow) ? 'Tracked' : 'Open'} detail="Delivery checkpoints and confirmation states are tracked through booking and escrow records." icon={<CircleDollarSign className="size-8" />} variant="finance" />
        <StatCard eyebrow="Risk posture" value="Guarded" detail="Safety checks and account protections help keep marketplace activity dependable." icon={<ShieldAlert className="size-8" />} variant="risk" />
        <StatCard eyebrow="Response time" value={`${bookings.data?.length ?? 0}`} detail="This counter reflects the bookings currently available in your account." icon={<TimerReset className="size-8" />} variant="activity" />
      </div>

      <Card id="client-quick-actions" variant="guidance" className="mt-6 scroll-mt-24">
        <SectionHeader
          eyebrow="Quick actions"
          title="Start faster"
          description="These shortcuts keep the next step visible even when the page gets busy."
          variant="guidance"
          sticky
          actions={
            <>
              <Link href="/dashboard/communications">
                <Button variant="ghost">Open inbox</Button>
              </Link>
              <Link href="/dashboard/notifications">
                <Button variant="ghost">View alerts</Button>
              </Link>
            </>
          }
        />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3 flex flex-wrap gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInlineSuccess(null);
                setActiveCategory('All');
                setServiceSearch('');
                jumpToClientSection('client-service-catalog');
              }}
            >
              Show all services
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInlineSuccess(null);
                setActiveCategory('Government Consultancy Services');
                setServiceSearch('');
                jumpToClientSection('client-service-catalog');
              }}
            >
              Government consultancy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInlineSuccess(null);
                jumpToClientSection('client-bookings-rail');
              }}
            >
              Open live bookings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInlineSuccess(null);
                jumpToClientSection('client-activity-timeline');
              }}
            >
              Review activity
            </Button>
          </div>
          <div className="rounded-[22px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.68),rgba(32,47,132,0.48))] p-4 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '0ms' }}>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Tracked bookings</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{trackedBookings}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Bookings already inside escrow flow.</p>
          </div>
          <div className="rounded-[22px] border border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.68),rgba(15,63,120,0.48))] p-4 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '55ms' }}>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Active delivery</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{activeDeliveries}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Work that is currently protected and in progress.</p>
          </div>
          <div className="rounded-[22px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.62),rgba(108,36,74,0.44))] p-4 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '110ms' }}>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Catalog results</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{categoryResultsCount}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Services matching the current filter and search.</p>
          </div>
        </div>
      </Card>

      {feedback ? (
        <div className="mt-6">
          <FeedbackBanner message={feedback} tone="info" onDismiss={() => setFeedback(null)} />
        </div>
      ) : null}
      {collectionGatewayPreview ? (
        <Card variant="finance" className="mt-6">
          <SectionHeader
            eyebrow="Collection response"
            title="Latest payment session"
            description="This preview confirms the last collection payload returned by the payment flow."
            variant="finance"
          />
          <pre className="mt-4 overflow-x-auto rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-xs text-[var(--text-secondary)]">
            {collectionGatewayPreview}
          </pre>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card id="client-service-catalog" variant="market" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Service catalog"
          title="Find the right digital service quickly"
          description="Search, narrow the catalog, and move directly into booking when a service looks right."
          variant="market"
          sticky
          actions={
              hasActiveCatalogFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setInlineSuccess(null);
                    setActiveCategory('All');
                    setServiceSearch('');
                  }}
                >
                  Reset filters
                </Button>
              ) : undefined
            }
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {wolfixMarketplaceLanes.map((lane) => (
              <span key={lane} className="rounded-full border border-[var(--line)] bg-[rgba(78,137,255,0.12)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--brand-secondary)]">
                {lane}
              </span>
            ))}
          </div>
          <div className="mt-5 grid gap-4 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(16,38,48,0.76),rgba(12,29,37,0.56))] p-5">
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="service-search">Search digital services</label>
              <input
                id="service-search"
                value={serviceSearch}
                onChange={(event) => {
                  setServiceSearch(event.target.value);
                  setInlineSuccess(null);
                }}
                placeholder="Search software, branding, social media, UX..."
              />
            </div>
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Quick find</p>
              <div className="flex flex-wrap gap-2">
                {['Software Engineering', 'Graphic Design', 'Social Media Management', 'Government Consultancy Services'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setServiceSearch(chip);
                      setInlineSuccess(null);
                    }}
                    className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] transition hover:border-[var(--brand-primary)] hover:text-[var(--text-primary)]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Filter by category</p>
              <div className="flex flex-wrap gap-2">
                {['All', ...wolfixServiceCategories].map((category) => {
                  const active = activeCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setActiveCategory(category);
                        setInlineSuccess(null);
                      }}
                      className={cn(
                        'rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.16em] transition',
                        active
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--ink-strong)]'
                          : 'border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                      )}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-4 text-sm text-[var(--text-secondary)]">
              <span>{categoryResultsCount} result{categoryResultsCount === 1 ? '' : 's'} in view</span>
              <span>{activeCategory === 'All' ? 'All categories' : activeCategory}</span>
            </div>
            <InlineStateNote message={catalogStateMessage} />
            {inlineSuccess?.scope === 'catalog' ? <InlineStateNote tone="success" message={inlineSuccess.message} /> : null}
          </div>
          <div className="mt-5 grid gap-4">
            {services.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : null}
            {services.isError ? (
              <FeedbackBanner message={services.error instanceof Error ? services.error.message : 'Unable to load services'} tone="danger" />
            ) : null}
            {filteredServices.map((service, index) => (
              <div key={service.id} className="rounded-[24px] border border-[rgba(123,165,255,0.2)] bg-[linear-gradient(180deg,rgba(12,35,91,0.62),rgba(18,64,134,0.42))] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(0,0,0,0.24)] animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: `${index * 45}ms` }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-display text-2xl text-[var(--text-primary)]">{service.title}</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{service.description ?? 'No description supplied yet.'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <ServiceCategoryBadge category={service.category} />
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{service.price_cents} minor units</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/dashboard/services/${service.id}`}>
                      <Button variant="ghost">Open service</Button>
                    </Link>
                    <Button
                      onClick={() => {
                        setFeedback(null);
                        createBooking.mutate(service.id);
                      }}
                      disabled={createBooking.isPending || createEscrow.isPending}
                    >
                      {createBooking.isPending ? 'Creating...' : 'Book service'}
                    </Button>
                  </div>
                </div>
                <NextActionHint
                  label="Review the service details first, then book it when the offer clearly matches your need."
                  action={
                    <Link href={`/dashboard/services/${service.id}`}>
                      <Button size="sm" variant="ghost">Review fit</Button>
                    </Link>
                  }
                />
              </div>
            ))}
            {!services.isLoading && !services.isError && !filteredServices.length ? (
              <EmptyState
                icon={<SearchX className="size-5" />}
                title="No services match the current search"
                description="Reset the current filters or try a broader term to reopen the catalog."
                action={
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveCategory('All');
                      setServiceSearch('');
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : null}
          </div>
        </Card>

        <Card id="client-bookings-rail" variant="finance" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Bookings and escrow"
          title="Follow every delivery from one rail"
          description="Each booking keeps the status, escrow state, payment step, and next action in one place."
          variant="finance"
          sticky
        />
          <div className="mt-5 space-y-4">
            {bookings.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : null}
            {bookings.isError ? (
              <FeedbackBanner message={bookings.error instanceof Error ? bookings.error.message : 'Unable to load bookings'} tone="danger" />
            ) : null}
            {bookings.data?.length ? bookings.data.map((booking, index) => (
              <div key={booking.id} className="rounded-[24px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.62),rgba(32,47,132,0.42))] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(0,0,0,0.24)] animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: `${index * 50}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xl text-[var(--text-primary)]">{booking.service_title}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge label={booking.status} tone={getBookingStatusTone(booking.status)} />
                      {booking.escrow ? <StatusBadge label={booking.escrow.status} tone={getEscrowStatusTone(booking.escrow.status)} /> : null}
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{booking.created_at}</p>
                  </div>
                  <div className="rounded-full border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em] text-[var(--brand-secondary)]">
                    #{booking.id}
                  </div>
                </div>
                <div className="mt-4">
                  <BookingProgressStrip booking={booking} />
                </div>
                <div className="mt-4 rounded-[20px] border border-[rgba(184,208,255,0.16)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  {booking.escrow ? (
                    <>
                      <p><span className="text-[var(--text-primary)]">Escrow:</span> {booking.escrow.reference}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-[var(--text-primary)]">State:</span>
                        <StatusBadge label={booking.escrow.status} tone={getEscrowStatusTone(booking.escrow.status)} />
                      </div>
                      <p><span className="text-[var(--text-primary)]">Amount:</span> {booking.escrow.amount_minor} {booking.escrow.currency}</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link href={`/dashboard/bookings/${booking.id}`}>
                          <Button size="sm" variant="ghost">Open workspace</Button>
                        </Link>
                        {booking.escrow.status === 'CREATED' ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setActiveEscrowId(booking.escrow?.id ?? null);
                              setActiveBookingId(booking.id);
                              setFeedback(null);
                            }}
                          >
                            Collect payment
                          </Button>
                        ) : null}
                        {booking.escrow.status === 'ACTIVE' ? (
                          <>
                            <Button size="sm" onClick={() => releaseEscrow.mutate(booking.id)} disabled={releaseEscrow.isPending}>
                              {releaseEscrow.isPending ? 'Releasing...' : 'Release escrow'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => disputeEscrow.mutate(booking.id)} disabled={disputeEscrow.isPending}>
                              {disputeEscrow.isPending ? 'Opening dispute...' : 'Open dispute'}
                            </Button>
                          </>
                        ) : null}
                        {booking.status === 'completed' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setReviewBookingId(booking.id);
                              setFeedback(null);
                            }}
                          >
                            Leave review
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setMessageBookingId(booking.id);
                            setFeedback(null);
                          }}
                        >
                          Message provider
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p>No escrow linked yet. Create one to start protected payment collection.</p>
                      <div className="flex flex-wrap gap-3">
                        <Link href={`/dashboard/bookings/${booking.id}`}>
                          <Button size="sm" variant="ghost">Open workspace</Button>
                        </Link>
                        <Button size="sm" onClick={() => createEscrow.mutate(booking.id)} disabled={createEscrow.isPending}>
                          {createEscrow.isPending ? 'Creating escrow...' : 'Create escrow'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <NextActionHint
                  label={getClientBookingNextStep(booking)}
                  action={
                    !booking.escrow ? (
                      <Button size="sm" variant="ghost" onClick={() => createEscrow.mutate(booking.id)} disabled={createEscrow.isPending}>
                        Create escrow
                      </Button>
                    ) : booking.escrow.status === 'CREATED' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActiveEscrowId(booking.escrow?.id ?? null);
                          setActiveBookingId(booking.id);
                          setFeedback(null);
                        }}
                      >
                        Collect now
                      </Button>
                    ) : booking.escrow.status === 'ACTIVE' ? (
                      <Link href={`/dashboard/bookings/${booking.id}`}>
                        <Button size="sm" variant="ghost">Open live booking</Button>
                      </Link>
                    ) : booking.status === 'completed' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReviewBookingId(booking.id);
                          setFeedback(null);
                        }}
                      >
                        Review outcome
                      </Button>
                    ) : (
                      <Link href={`/dashboard/bookings/${booking.id}`}>
                        <Button size="sm" variant="ghost">Open workspace</Button>
                      </Link>
                    )
                  }
                />
                {inlineSuccess?.bookingId === booking.id && inlineSuccess.scope !== 'catalog' ? (
                  <div className="mt-4">
                    <InlineStateNote tone="success" message={inlineSuccess.message} />
                  </div>
                ) : null}
                {activeEscrowId === booking.escrow?.id && activeBookingId === booking.id ? (
                  <form className="mt-4 grid gap-4 rounded-[20px] border border-[rgba(184,208,255,0.16)] bg-[rgba(255,255,255,0.04)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" onSubmit={handleCollectionSubmit}>
                    <DraftStatusNote
                      dirty={collectionForm.formState.isDirty}
                      isSaving={collectPayment.isPending}
                      pristineMessage="No unsaved payment collection details are waiting here."
                      dirtyMessage="This payment request has unsaved details. Submit only when the wallet and provider are correct."
                      savingMessage="Starting the payment collection request..."
                    />
                    <div id={`client-collection-summary-${booking.id}`}>
                      <FormValidationSummary
                        title="The payment collection request still needs a few corrections"
                        errors={collectionErrors}
                      />
                    </div>
                    <FormSection
                      step="01"
                      title="Payment destination"
                      description="Set the wallet that should receive the collection prompt for this booking."
                      tone="finance"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm text-[var(--text-secondary)]" htmlFor={`msisdn-${booking.id}`}>MSISDN</label>
                          <input id={`msisdn-${booking.id}`} placeholder="2557XXXXXXXX" {...collectionForm.register('msisdn')} />
                          <FormHint text="Use the wallet number that should receive the payment prompt for this booking." />
                          {collectionForm.formState.errors.msisdn ? <p className="text-sm text-rose-300">{collectionForm.formState.errors.msisdn.message}</p> : null}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-[var(--text-secondary)]" htmlFor={`provider-${booking.id}`}>Provider</label>
                          <select id={`provider-${booking.id}`} {...collectionForm.register('provider')}>
                            <option value="MPESA">M-Pesa</option>
                            <option value="AIRTEL">Airtel Money</option>
                            <option value="YAS">YAS</option>
                          </select>
                          <FormHint text="Choose the same provider linked to that number so the collection request reaches the correct wallet." />
                          {collectionForm.formState.errors.provider ? <p className="text-sm text-rose-300">{collectionForm.formState.errors.provider.message}</p> : null}
                        </div>
                      </div>
                    </FormSection>
                    {collectionReady ? <InlineStateNote tone="success" message="The payment prompt is ready to be sent to the selected wallet." /> : null}
                    <FormActionDock
                      title="Collection actions"
                      hint="Submit only after the wallet number and provider clearly match the payment destination for this booking."
                    >
                      <Button type="submit" size="sm" disabled={collectPayment.isPending}>
                        {collectPayment.isPending ? 'Starting collection...' : 'Start collection'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveEscrowId(null);
                          setActiveBookingId(null);
                          collectionForm.reset({
                            msisdn: '',
                            provider: 'MPESA',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </FormActionDock>
                  </form>
                ) : null}
                {reviewBookingId === booking.id ? (
                  <form className="mt-4 grid gap-4 rounded-[20px] border border-[rgba(255,151,182,0.16)] bg-[rgba(255,255,255,0.04)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" onSubmit={handleReviewSubmit}>
                    <DraftStatusNote
                      dirty={reviewForm.formState.isDirty}
                      isSaving={createReview.isPending}
                      pristineMessage="No unsaved review draft is waiting here."
                      dirtyMessage="This review has unsaved edits. Submit only when it reflects the delivery outcome clearly."
                      savingMessage="Submitting the review..."
                    />
                    <div id={`client-review-summary-${booking.id}`}>
                      <FormValidationSummary
                        title="The review still needs a few corrections"
                        errors={reviewErrors}
                      />
                    </div>
                    <FormSection
                      step="01"
                      title="Rate and describe the outcome"
                      description="Keep the review tied to delivery quality, communication, and whether the work matched expectations."
                      tone="guidance"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm text-[var(--text-secondary)]" htmlFor={`review-rating-${booking.id}`}>Rating</label>
                          <select id={`review-rating-${booking.id}`} {...reviewForm.register('rating', { valueAsNumber: true })}>
                            <option value={5}>5</option>
                            <option value={4}>4</option>
                            <option value={3}>3</option>
                            <option value={2}>2</option>
                            <option value={1}>1</option>
                          </select>
                          <FormHint text="Give the score that best matches the full delivery experience, not one isolated detail." />
                          {reviewForm.formState.errors.rating ? <p className="text-sm text-rose-300">{reviewForm.formState.errors.rating.message}</p> : null}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[var(--text-secondary)]" htmlFor={`review-comment-${booking.id}`}>Comment</label>
                        <textarea id={`review-comment-${booking.id}`} rows={4} placeholder="How was the delivery experience?" {...reviewForm.register('comment')} />
                        <FormHint text="Mention outcomes, communication quality, and whether the service matched the promise." />
                        {reviewForm.formState.errors.comment ? <p className="text-sm text-rose-300">{reviewForm.formState.errors.comment.message}</p> : null}
                      </div>
                    </FormSection>
                    {reviewReady ? <InlineStateNote tone="success" message="This review already gives enough context to be useful to future buyers." /> : null}
                    <FormActionDock
                      title="Review actions"
                      hint="Submit when the rating and comment reflect the real delivery experience in clear language."
                    >
                      <Button type="submit" size="sm" disabled={createReview.isPending}>
                        {createReview.isPending ? 'Submitting review...' : 'Submit review'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReviewBookingId(null);
                          reviewForm.reset({
                            rating: 5,
                            comment: '',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </FormActionDock>
                  </form>
                ) : null}
                {messageBookingId === booking.id ? (
                  <form className="mt-4 grid gap-4 rounded-[20px] border border-[rgba(124,194,255,0.16)] bg-[rgba(255,255,255,0.04)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" onSubmit={handleMessageSubmit}>
                    <DraftStatusNote
                      dirty={messageForm.formState.isDirty}
                      isSaving={sendMessage.isPending}
                      pristineMessage="No unsaved booking message is waiting here."
                      dirtyMessage="This booking message has unsaved text. Send it only when the note is specific enough to move the work forward."
                      savingMessage="Sending the booking message..."
                    />
                    <div id={`client-message-summary-${booking.id}`}>
                      <FormValidationSummary
                        title="The booking message still needs a few corrections"
                        errors={messageErrors}
                      />
                    </div>
                    <FormSection
                      step="01"
                      title="Keep the message tied to the work"
                      description="Use this note for scope clarification, delivery updates, or the next action on the booking."
                      tone="activity"
                    >
                      <div className="space-y-2">
                        <label className="text-sm text-[var(--text-secondary)]" htmlFor={`message-content-${booking.id}`}>Message provider</label>
                        <textarea
                          id={`message-content-${booking.id}`}
                          rows={4}
                          placeholder="Share delivery details, ask a question, or confirm the next step."
                          {...messageForm.register('content')}
                        />
                        <FormHint text="Keep the note tied to delivery progress, scope, or the next action on this booking." />
                        {messageForm.formState.errors.content ? <p className="text-sm text-rose-300">{messageForm.formState.errors.content.message}</p> : null}
                      </div>
                    </FormSection>
                    {messageReady ? <InlineStateNote tone="success" message="The note is clear enough to keep the booking conversation moving without extra guesswork." /> : null}
                    <FormActionDock
                      title="Message actions"
                      hint="Send only when the note is tied to the next step, delivery status, or a real clarification."
                    >
                      <Button type="submit" size="sm" disabled={sendMessage.isPending}>
                        {sendMessage.isPending ? 'Sending...' : 'Send message'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMessageBookingId(null);
                          messageForm.reset({
                            content: '',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </FormActionDock>
                  </form>
                ) : null}
              </div>
            )) : null}
            {!bookings.isLoading && !bookings.isError && !bookings.data?.length ? (
              <EmptyState
                icon={<CircleDollarSign className="size-5" />}
                title="No bookings yet"
                description="Start with the catalog above, create the first booking, and this rail will begin showing the current state and next step for that work."
              />
            ) : null}
          </div>
        </Card>
      </div>

      <Card id="client-activity-timeline" variant="activity" className="mt-6 scroll-mt-24">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Activity timeline</p>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {bookings.data?.slice(0, 4).map((booking) => (
            <BookingTimeline key={`timeline-${booking.id}`} booking={booking} perspective="client" />
          ))}
          {!bookings.isLoading && !bookings.data?.length ? (
            <EmptyState
              icon={<TimerReset className="size-5" />}
              title="No booking timeline yet"
              description="Booking activity timelines will appear here once you start creating bookings."
            />
          ) : null}
        </div>
      </Card>
    </DashboardShell>
  );
}
