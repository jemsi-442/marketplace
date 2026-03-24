'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleDollarSign, Layers3, MessageSquareMore, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { ServiceCategoryBadge } from '@/components/dashboard/service-category-badge';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ActionSummaryStrip } from '@/components/ui/action-summary-strip';
import { DraftStatusNote } from '@/components/ui/draft-status-note';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { FormActionDock } from '@/components/ui/form-action-dock';
import { FormHint } from '@/components/ui/form-hint';
import { FormSection } from '@/components/ui/form-section';
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
import { wolfixMarketplaceLanes, wolfixServiceCategories } from '@/lib/marketplace';
import { getBookingStatusTone, getEscrowStatusTone, getRiskLevelTone } from '@/lib/status';

const serviceSchema = z.object({
  title: z.string().min(3, 'Service title is required'),
  description: z.string().max(1500).optional().or(z.literal('')),
  category: z.string().max(100).optional().or(z.literal('')),
  price_cents: z.number().int().positive('Enter a positive price'),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

function resolveLane(category?: string | null): string {
  if (!category) {
    return wolfixMarketplaceLanes[0];
  }

  if (category.includes('Design') || category.includes('Brand') || category.includes('Motion') || category.includes('Video')) {
    return wolfixMarketplaceLanes[1];
  }

  if (category.includes('Social') || category.includes('Marketing')) {
    return wolfixMarketplaceLanes[2];
  }

  if (category.includes('SEO') || category.includes('Analytics') || category.includes('Content')) {
    return wolfixMarketplaceLanes[3];
  }

  return wolfixMarketplaceLanes[0];
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

export default function ServiceWorkspacePage() {
  const params = useParams<{ id: string }>();
  const serviceId = Number(params.id);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inlineSuccess, setInlineSuccess] = useState<{ scope: 'booking' | 'listing'; message: string } | null>(null);
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      price_cents: 0,
    },
  });
  const watchedListingTitle = useWatch({ control: form.control, name: 'title' }) ?? '';
  const watchedListingCategory = useWatch({ control: form.control, name: 'category' }) ?? '';
  const watchedListingPrice = useWatch({ control: form.control, name: 'price_cents' });
  const watchedListingDescription = useWatch({ control: form.control, name: 'description' }) ?? '';

  const service = useQuery({
    queryKey: ['service-workspace', token, serviceId],
    queryFn: () => apiClient.getService(serviceId, token),
    enabled: Number.isFinite(serviceId),
  });

  const bookings = useQuery({
    queryKey: ['service-workspace-bookings', token],
    queryFn: () => apiClient.getBookings(token ?? ''),
    enabled: Boolean(token),
  });
  const services = useQuery({
    queryKey: ['service-workspace-services', token],
    queryFn: () => apiClient.getServices(token),
  });

  const vendorTrust = useQuery({
    queryKey: ['service-workspace-vendor-trust', token],
    queryFn: () => apiClient.getVendorTrust(token ?? ''),
    enabled: Boolean(token) && user?.id === service.data?.vendor_user_id,
  });
  const vendorReviews = useQuery({
    queryKey: ['service-workspace-vendor-reviews', service.data?.vendor_user_id],
    queryFn: () => apiClient.getVendorReviews(service.data?.vendor_user_id ?? 0),
    enabled: typeof service.data?.vendor_user_id === 'number',
  });

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Sign in first to book this service');
      }

      return apiClient.createBooking(token, serviceId);
    },
    onSuccess: async (response) => {
      setFeedback(`Booking created: #${response.booking_id}`);
      setInlineSuccess({
        scope: 'booking',
        message: 'Booking created. Continue in the booking workspace when you are ready to protect payment and track delivery.',
      });
      await queryClient.invalidateQueries({ queryKey: ['service-workspace-bookings'] });
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to create booking');
    },
  });
  const updateService = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      if (!token) {
        throw new Error('Sign in first to manage this service');
      }

      return apiClient.updateService(token, serviceId, {
        title: values.title,
        description: values.description || null,
        category: values.category || null,
        price_cents: values.price_cents,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'listing',
        message: 'Listing updated. Buyers now see the latest title, lane, price, and scope for this service.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['service-workspace', token, serviceId] }),
        queryClient.invalidateQueries({ queryKey: ['services'] }),
      ]);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to update service');
    },
  });
  const disableService = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Sign in first to manage this service');
      }

      return apiClient.deleteService(token, serviceId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setInlineSuccess({
        scope: 'listing',
        message: 'Service disabled. It stays on record, but should no longer behave like a live buyer-facing offer.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['service-workspace', token, serviceId] }),
        queryClient.invalidateQueries({ queryKey: ['services'] }),
      ]);
    },
    onError: (error) => {
      setInlineSuccess(null);
      setFeedback(error instanceof Error ? error.message : 'Unable to disable service');
    },
  });

  useEffect(() => {
    if (!service.data) {
      return;
    }

    form.reset({
      title: service.data.title,
      description: service.data.description ?? '',
      category: service.data.category ?? '',
      price_cents: service.data.price_cents,
    });
  }, [form, service.data]);

  useEffect(() => {
    if (!form.formState.isDirty) {
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
  }, [form.formState.isDirty]);

  const serviceBookings = useMemo(
    () => (bookings.data ?? []).filter((booking) => booking.service_id === serviceId),
    [bookings.data, serviceId],
  );
  const reviewSummary = useMemo(() => {
    const reviews = vendorReviews.data ?? [];

    if (!reviews.length) {
      return {
        total: 0,
        average: 0,
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);

    return {
      total: reviews.length,
      average: totalRating / reviews.length,
    };
  }, [vendorReviews.data]);
  const servicePerformance = useMemo(() => {
    const total = serviceBookings.length;
    const escrowAttached = serviceBookings.filter((booking) => booking.escrow).length;
    const released = serviceBookings.filter((booking) => booking.escrow?.status === 'RELEASED').length;
    const disputed = serviceBookings.filter((booking) => booking.escrow?.status === 'DISPUTED').length;
    const completed = serviceBookings.filter((booking) => booking.status.toLowerCase() === 'completed').length;

    return {
      total,
      escrowAttached,
      released,
      disputed,
      completed,
    };
  }, [serviceBookings]);
  const relatedServices = useMemo(() => {
    const allServices = services.data ?? [];

    return allServices
      .filter((item) => item.id !== serviceId)
      .filter((item) => {
        if (!service.data) {
          return false;
        }

        return (
          item.category === service.data.category ||
          item.vendor_user_id === service.data.vendor_user_id
        );
      })
      .slice(0, 4);
  }, [service.data, serviceId, services.data]);
  const latestBooking = serviceBookings[0] ?? null;
  const isVendorOwner = user?.id === service.data?.vendor_user_id;
  const lane = resolveLane(service.data?.category);
  const listingDraftReady = Boolean(
    watchedListingTitle.trim() &&
      watchedListingCategory.trim() &&
      Number(watchedListingPrice) > 0 &&
      watchedListingDescription.trim().length >= 40,
  );
  const serviceErrors = getFormErrorMessages(form.formState.errors as Record<string, unknown>);
  const servicePriority = !service.data
    ? {
        title: 'Service context is loading',
        description: 'Stay on this page for a moment so the latest service, booking, and review state can settle before you decide what to do next.',
        tone: 'guidance' as const,
      }
    : isVendorOwner
      ? latestBooking
        ? {
            title: 'A live booking tied to this listing deserves attention first',
            description: 'Open the latest booking workspace before changing the listing if delivery or settlement is already in motion for this service.',
            tone: 'communication' as const,
          }
        : !service.data.is_active
          ? {
              title: 'This listing is inactive and ready for a deliberate update',
              description: 'Review the controls next so you can decide whether the service should stay inactive or return with clearer scope and pricing.',
              tone: 'market' as const,
            }
          : {
              title: 'This listing can be refined for stronger buyer clarity',
              description: 'Use the controls when the title, category, price, or service brief genuinely needs improvement for the next buyer decision.',
              tone: 'guidance' as const,
            }
      : latestBooking
        ? {
            title: 'You already have live work attached to this service',
            description: 'Continue in the booking workspace first so delivery, settlement, and conversation stay attached to the active work item.',
            tone: 'activity' as const,
          }
        : {
            title: 'Review fit, then book only when the offer is clear',
            description: 'Use the overview and activity signals to judge this service first, then create a booking when you are ready to move into formal execution.',
            tone: 'finance' as const,
          };
  const handleServiceSubmit = form.handleSubmit(async (values) => {
    setFeedback(null);
    await updateService.mutateAsync(values);
  });

  const jumpToServiceSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const serviceTip = isVendorOwner
    ? 'Use this page to keep the listing clear and current. Change the service only when it improves clarity for buyers.'
    : 'Read the service brief, confirm the category and price, then book only when the service really matches your need.';

  return (
    <DashboardShell
      title="Service workspace"
      subtitle="Review one WOLFIX service in detail before booking, pricing, delivery alignment, and escrow-backed execution."
      mobileQuickActions={
        <div className="grid grid-cols-3 gap-2">
          <Link href="#service-overview-section">
            <Button size="sm" variant="ghost" className="w-full">Overview</Button>
          </Link>
          <Link href="#service-activity-section">
            <Button size="sm" className="w-full">Activity</Button>
          </Link>
          <Link href={isVendorOwner ? '#service-controls-section' : '#service-related-section'}>
            <Button size="sm" variant="ghost" className="w-full">{isVendorOwner ? 'Controls' : 'Related'}</Button>
          </Link>
        </div>
      }
    >
      <WorkspaceGuide
        eyebrow="How to use this service page"
        title={isVendorOwner ? 'This page helps you manage one listing cleanly' : 'This page helps you decide whether to book this service'}
        description={
          isVendorOwner
            ? 'Use this workspace to keep the service accurate, understandable, and commercially strong before buyers act on it.'
            : 'Use this workspace to understand the service, compare its category and price, and move into booking only when the offer is clear.'
        }
        points={
          isVendorOwner
            ? [
                'Review the title, description, category, and price before editing anything.',
                'Use performance and recent booking context to judge whether the listing is working.',
                'Only disable the service when it should stop receiving new work.',
                'Open the latest booking workspace when one specific delivery needs attention.',
              ]
            : [
                'Read the service brief first before pressing the booking button.',
                'Use the lane, category, and review context to judge fit quickly.',
                'Open the latest booking workspace if you already started work on this listing.',
                'Book only when you are ready to move the service into the formal workflow.',
              ]
        }
        tip={serviceTip}
      />

      <div className="mt-6">
        <WorkflowSteps
          eyebrow="Typical service path"
          title={isVendorOwner ? 'How providers usually use this page' : 'How clients usually use this page'}
          steps={
            isVendorOwner
              ? [
                  { title: 'Review the listing', description: 'Check whether the service still explains the offer clearly.' },
                  { title: 'Refine details', description: 'Adjust title, price, category, or description when clarity needs improvement.' },
                  { title: 'Check activity', description: 'Use bookings, reviews, and related services as signals of performance.' },
                  { title: 'Move to delivery', description: 'Open the latest booking workspace when a live client task needs attention.' },
                ]
              : [
                  { title: 'Read the offer', description: 'Check the title, service brief, category, and lane first.' },
                  { title: 'Judge fit', description: 'Use review and trust context to decide whether this listing matches the need.' },
                  { title: 'Book the service', description: 'Create a booking when you are ready to start formal delivery.' },
                  { title: 'Track the work', description: 'Use the booking workspace once the service moves into active execution.' },
                ]
          }
        />
      </div>

      <SectionNavigator
        className="mt-6"
        title="Jump to the exact service section"
        description="Use these anchors when you already know whether you need the offer overview, delivery signals, related work, or owner controls."
        items={[
          { href: '#service-overview-section', label: 'Overview', helper: 'Read the offer, price, and lane.' },
          { href: '#service-activity-section', label: 'Activity', helper: 'Check bookings and quality context.' },
          { href: '#service-related-section', label: 'Related', helper: 'Compare alternatives in the same lane.' },
          ...(isVendorOwner ? [{ href: '#service-controls-section', label: 'Controls', helper: 'Update the listing safely.' }] : []),
        ]}
      />

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '90ms' }}>
        <PriorityBanner
          title={servicePriority.title}
          description={servicePriority.description}
          tone={servicePriority.tone}
          actions={
            <>
              <Button
                size="sm"
                variant={!isVendorOwner && !latestBooking ? 'primary' : 'ghost'}
                onClick={() => jumpToServiceSection('service-overview-section')}
              >
                Review overview
              </Button>
              <Button
                size="sm"
                variant={latestBooking ? 'primary' : 'ghost'}
                onClick={() => jumpToServiceSection('service-activity-section')}
              >
                Check activity
              </Button>
              {isVendorOwner ? (
                <Button
                  size="sm"
                  variant={!service.data?.is_active || form.formState.isDirty ? 'primary' : 'ghost'}
                  onClick={() => jumpToServiceSection('service-controls-section')}
                >
                  Open controls
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={latestBooking ? 'primary' : 'ghost'}
                  onClick={() => jumpToServiceSection('service-related-section')}
                >
                  Compare related
                </Button>
              )}
              {latestBooking ? (
                <Link href={`/dashboard/bookings/${latestBooking.id}`}>
                  <Button size="sm" variant="ghost">
                    Open latest booking
                  </Button>
                </Link>
              ) : null}
            </>
          }
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href={isVendorOwner ? '/dashboard/vendor' : '/dashboard/client'} className="inline-flex">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 size-4" />
            Back to dashboard
          </Button>
        </Link>
        <Link href="/dashboard/client" className="inline-flex">
          <Button variant="ghost">Back to catalog</Button>
        </Link>
      </div>

      <Card variant="guidance" className="mb-6">
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/notifications">
            <Button variant="ghost" size="sm">View alerts</Button>
          </Link>
          <Link href={isVendorOwner ? '/dashboard/vendor' : '/dashboard/client'}>
            <Button variant="ghost" size="sm">{isVendorOwner ? 'Open service studio' : 'Open bookings'}</Button>
          </Link>
          {latestBooking ? (
            <Link href={`/dashboard/bookings/${latestBooking.id}`}>
              <Button variant="ghost" size="sm">Open latest booking</Button>
            </Link>
          ) : null}
        </div>
      </Card>

      {service.data ? (
        <ActionSummaryStrip
          className="mb-6"
          title="What matters on this service right now"
          items={[
            {
              eyebrow: 'Current state',
              value: service.data.is_active ? 'Live listing' : 'Inactive listing',
              detail: `${service.data.price_cents} minor units · ${service.data.category ?? 'Uncategorised'} · lane ${lane.toLowerCase()}.`,
              icon: <Layers3 className="size-5" />,
              tone: 'activity',
            },
            {
              eyebrow: 'Next safe move',
              value: isVendorOwner ? 'Refine or monitor' : latestBooking ? 'Open live booking' : 'Book service',
              detail: isVendorOwner ? 'Improve clarity only when title, scope, category, or price genuinely needs it.' : latestBooking ? 'Continue from the current booking workspace if work already started here.' : 'Create a booking only when the offer clearly matches the need.',
              icon: <CircleDollarSign className="size-5" />,
              tone: 'finance',
            },
            {
              eyebrow: 'Continue here',
              value: latestBooking ? 'Booking workspace' : isVendorOwner ? 'Service studio' : 'Catalog lane',
              detail: latestBooking ? 'Use the latest booking for delivery, settlement, and conversation context.' : isVendorOwner ? 'Return to the wider studio when you need inventory, payouts, or profile work.' : 'Return to the catalog if you still need to compare alternatives before booking.',
              icon: <MessageSquareMore className="size-5" />,
              tone: 'guidance',
            },
          ]}
        />
      ) : null}

      {feedback ? (
        <div className="mb-6">
          <FeedbackBanner message={feedback} tone="info" onDismiss={() => setFeedback(null)} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card id="service-overview-section" variant="market" className="scroll-mt-24">
          {service.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : null}
          {service.isError ? <FeedbackBanner message={service.error instanceof Error ? service.error.message : 'Unable to load service'} tone="danger" /> : null}
          {service.data ? (
            <>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">WOLFIX service listing</p>
                  <h1 className="mt-3 font-display text-4xl tracking-[-0.04em] text-[var(--text-primary)] drop-shadow-[0_18px_34px_rgba(47,107,255,0.2)]">{service.data.title}</h1>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <StatusBadge label={service.data.is_active ? 'live' : 'inactive'} tone={service.data.is_active ? 'success' : 'warning'} />
                    <ServiceCategoryBadge category={service.data.category} />
                    <span className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      {lane}
                    </span>
                  </div>
                </div>
                <div className="rounded-[24px] border border-[rgba(170,180,255,0.24)] bg-[linear-gradient(180deg,rgba(20,26,84,0.7),rgba(32,47,132,0.48))] p-5 text-right transition duration-300 hover:-translate-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Price</p>
                  <p className="mt-3 font-display text-4xl text-[var(--text-primary)]">{service.data.price_cents}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Minor units</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-[22px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.62),rgba(32,47,132,0.42))] p-4 transition duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 text-[var(--brand-secondary)]">
                    <CircleDollarSign className="size-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">Escrow ready</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    Booking this service can move straight into protected collection and release flow.
                  </p>
                </div>
                <div className="rounded-[22px] border border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.62),rgba(15,63,120,0.42))] p-4 transition duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 text-[var(--brand-secondary)]">
                    <Layers3 className="size-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">Marketplace lane</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    This listing fits inside the WOLFIX lane for {lane.toLowerCase()}.
                  </p>
                </div>
                <div className="rounded-[22px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.56),rgba(108,36,74,0.4))] p-4 transition duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 text-[var(--brand-secondary)]">
                    <ShieldCheck className="size-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">Trust controls</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    Escrow, reviews, risk scoring, and notifications stay attached to the service workflow.
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-[26px] border border-[rgba(123,165,255,0.2)] bg-[linear-gradient(180deg,rgba(12,35,91,0.58),rgba(18,64,134,0.38))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">Service brief</p>
                <p className="mt-4 text-sm leading-8 text-[var(--text-secondary)]">
                  {service.data.description ?? 'No long-form description has been added yet for this service.'}
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {!isVendorOwner ? (
                  <Button onClick={() => {
                    setInlineSuccess(null);
                    createBooking.mutate();
                  }} disabled={createBooking.isPending}>
                    {createBooking.isPending ? 'Creating booking...' : 'Book this service'}
                  </Button>
                ) : null}
              {latestBooking ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge label={latestBooking.status} tone={getBookingStatusTone(latestBooking.status)} />
                    {latestBooking.escrow ? <StatusBadge label={latestBooking.escrow.status} tone={getEscrowStatusTone(latestBooking.escrow.status)} /> : null}
                    <Link href={`/dashboard/bookings/${latestBooking.id}`}>
                      <Button variant="ghost">Open latest booking workspace</Button>
                    </Link>
                  </div>
                ) : null}
              </div>
              {inlineSuccess?.scope === 'booking' ? (
                <div className="mt-4">
                  <InlineStateNote tone="success" message={inlineSuccess.message} />
                </div>
              ) : null}
            </>
          ) : null}
        </Card>

        <div className="space-y-6">
          <Card variant="guidance">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Delivery fit</p>
            <div className="mt-5 space-y-4">
              {[
                'Use this page to check category fit before creating a booking.',
                'Once booked, the flow moves into escrow creation, collection, release, or dispute.',
                'Messaging, notifications, and trust tracking all connect back to the service execution path.',
              ].map((item) => (
                <div key={item} className="rounded-[22px] border border-[rgba(184,208,255,0.16)] bg-[rgba(255,255,255,0.04)] p-4 text-sm leading-7 text-[var(--text-secondary)] transition duration-300 hover:-translate-y-1">
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card variant="activity">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#a7c4ff]">Category map</p>
                <h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)] drop-shadow-[0_16px_30px_rgba(47,107,255,0.14)]">Catalog placement</h2>
              </div>
              <TrendingUp className="size-5 text-[#a7c4ff]" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {wolfixServiceCategories.map((category) => (
                <ServiceCategoryBadge key={category} category={category} className={category === service.data?.category ? 'ring-1 ring-[var(--ring)]' : ''} />
              ))}
            </div>
          </Card>

          <Card variant="risk">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#ffb5cb]">Proof layer</p>
                <h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)] drop-shadow-[0_16px_30px_rgba(255,108,156,0.12)]">Review signal</h2>
              </div>
              <Sparkles className="size-5 text-[#ffb5cb]" />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[22px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.56),rgba(108,36,74,0.4))] p-4 transition duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Average rating</p>
                <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">
                  {reviewSummary.total ? reviewSummary.average.toFixed(1) : '--'}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {reviewSummary.total ? `${reviewSummary.total} verified review signals` : 'No reviews attached to this listing yet.'}
                </p>
              </div>
              <div className="rounded-[22px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.56),rgba(108,36,74,0.4))] p-4 transition duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Latest feedback</p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {vendorReviews.data?.[0]?.comment ?? 'Recent review text will appear here once bookings are completed.'}
                </p>
              </div>
            </div>
          </Card>

          <Card id="service-activity-section" variant="communication" className="scroll-mt-24">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#9fdfff]">Current flow status</p>
                <h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)] drop-shadow-[0_16px_30px_rgba(78,137,255,0.14)]">Service activity around you</h2>
              </div>
              <MessageSquareMore className="size-5 text-[#9fdfff]" />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[22px] border border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.62),rgba(15,63,120,0.42))] p-4 transition duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Visible bookings</p>
                <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{serviceBookings.length}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Based on the signed-in user scope and current booking feed.
                </p>
              </div>
              <div className="rounded-[22px] border border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.62),rgba(15,63,120,0.42))] p-4 transition duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Quality snapshot</p>
                <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">
                  {isVendorOwner && vendorTrust.data ? vendorTrust.data.calculated_trust_score : '--'}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {isVendorOwner && vendorTrust.data
                    ? `${vendorTrust.data.risk_level} risk · rating ${vendorTrust.data.average_rating.toFixed(1)}`
                    : 'Visible to the listing owner when signed in.'}
                </p>
                {isVendorOwner && vendorTrust.data ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge label={vendorTrust.data.risk_level} tone={getRiskLevelTone(vendorTrust.data.risk_level)} />
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          <Card id="service-related-section" variant="finance" className="scroll-mt-24">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#c9d5ff]">Related opportunities</p>
                <h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)] drop-shadow-[0_16px_30px_rgba(47,107,255,0.14)]">Keep moving in the same lane</h2>
              </div>
              <Sparkles className="size-5 text-[#c9d5ff]" />
            </div>
            <div className="mt-5 space-y-4">
              {relatedServices.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.62),rgba(32,47,132,0.42))] p-4 transition duration-300 hover:-translate-y-1">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-display text-xl text-[var(--text-primary)]">{item.title}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ServiceCategoryBadge category={item.category} />
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                        {item.description ?? 'No detailed description has been added for this service yet.'}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-3 lg:items-end">
                      <p className="font-display text-2xl text-[var(--text-primary)]">{item.price_cents}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Minor units</p>
                      <Link href={`/dashboard/services/${item.id}`}>
                        <Button size="sm" variant="ghost">Open service</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {!relatedServices.length ? (
                <EmptyState
                  icon={<Sparkles className="size-5" />}
                  title="No related services yet"
                  description={isVendorOwner
                    ? 'No other listing currently shares this lane or provider trail. Use the controls to sharpen this offer, or return to the wider studio to add another complementary listing.'
                    : 'No close alternatives are visible in this lane right now. If this offer is not the right fit, return to the catalog and broaden the search before booking.'}
                  action={
                    <div className="flex flex-wrap gap-3">
                      <Link href={isVendorOwner ? '/dashboard/vendor#vendor-service-inventory' : '/dashboard/client#client-service-catalog'}>
                        <Button variant="ghost">
                          {isVendorOwner ? 'Open service inventory' : 'Browse catalog'}
                        </Button>
                      </Link>
                      {isVendorOwner ? (
                        <Button variant="ghost" onClick={() => jumpToServiceSection('service-controls-section')}>
                          Refine this listing
                        </Button>
                      ) : null}
                    </div>
                  }
                />
              ) : null}
            </div>
          </Card>

          {isVendorOwner ? (
            <Card id="service-controls-section" variant="market" className="scroll-mt-24">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Listing controls</p>
                  <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Manage this listing</h2>
                </div>
                <span className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Owner mode
                </span>
              </div>

              <form className="mt-5 grid gap-5" onSubmit={handleServiceSubmit}>
                <DraftStatusNote
                  dirty={form.formState.isDirty}
                  isSaving={updateService.isPending}
                  pristineMessage="This service currently matches the last saved state."
                  dirtyMessage="This service has unsaved edits. Save before leaving if these listing changes should stay visible."
                  savingMessage="Saving the latest service changes..."
                />
                <FormValidationSummary
                  title="The service listing still needs a few corrections"
                  errors={serviceErrors}
                />
                <FormSection
                  step="01"
                  title="Core offer"
                  description="Keep the title strong enough that the buyer understands the offer before reading everything else."
                  tone="market"
                >
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]" htmlFor="workspace-service-title">Title</label>
                    <input id="workspace-service-title" placeholder="Premium service title" {...form.register('title')} />
                    <FormHint text="Use the clearest buyer-facing title, not an internal package name." />
                    {form.formState.errors.title ? <p className="text-sm text-rose-300">{form.formState.errors.title.message}</p> : null}
                  </div>
                </FormSection>

                <FormSection
                  step="02"
                  title="Placement and pricing"
                  description="Choose the lane and opening price that best match the actual scope of delivery."
                  tone="activity"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]" htmlFor="workspace-service-category">Category</label>
                      <select id="workspace-service-category" {...form.register('category')}>
                        <option value="">Select a WOLFIX category</option>
                        {wolfixServiceCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                        <option value="Other Digital Service">Other Digital Service</option>
                      </select>
                      <FormHint text="Keep the category aligned with the main outcome, not every tool used in delivery." />
                      {form.formState.errors.category ? <p className="text-sm text-rose-300">{form.formState.errors.category.message}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]" htmlFor="workspace-service-price">Price minor units</label>
                      <input
                        id="workspace-service-price"
                        type="number"
                        min="1"
                        {...form.register('price_cents', { valueAsNumber: true })}
                      />
                      <FormHint text="Use the starting commitment buyers should expect for the first scope of work." />
                      {form.formState.errors.price_cents ? <p className="text-sm text-rose-300">{form.formState.errors.price_cents.message}</p> : null}
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  step="03"
                  title="Delivery boundaries"
                  description="Describe scope, revisions, timing, and client expectations in plain business language."
                  tone="guidance"
                >
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]" htmlFor="workspace-service-description">Description</label>
                    <textarea
                      id="workspace-service-description"
                      rows={6}
                      placeholder="Clarify outcomes, scope, revisions, delivery windows, and client expectations."
                      {...form.register('description')}
                    />
                    <FormHint text="A good description reduces the need for back-and-forth before booking." />
                    {form.formState.errors.description ? <p className="text-sm text-rose-300">{form.formState.errors.description.message}</p> : null}
                  </div>
                </FormSection>

                {listingDraftReady ? (
                  <InlineStateNote tone="success" message="This listing draft is already strong enough for a buyer to understand the offer, placement, and commercial starting point." />
                ) : (
                  <InlineStateNote message="A cleaner listing usually has a strong title, the right lane, a real starting price, and a description that reduces buyer doubt." />
                )}
                {inlineSuccess?.scope === 'listing' ? <InlineStateNote tone="success" message={inlineSuccess.message} /> : null}

                <FormActionDock
                  title="Listing actions"
                  hint="Save only when the offer is clearer than before, and disable it only when it should stop receiving new work."
                >
                  <Button type="submit" disabled={updateService.isPending}>
                    {updateService.isPending ? 'Saving service...' : 'Save changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setFeedback(null);
                      setInlineSuccess(null);
                      disableService.mutate();
                    }}
                    disabled={disableService.isPending}
                  >
                    {disableService.isPending ? 'Disabling...' : 'Disable service'}
                  </Button>
                </FormActionDock>
              </form>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Bookings on this service</p>
                  <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{servicePerformance.total}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {servicePerformance.completed} completed · {servicePerformance.escrowAttached} with escrow coverage
                  </p>
                </div>
                <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Escrow outcomes</p>
                  <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{servicePerformance.released}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Released · {servicePerformance.disputed} disputed on this listing
                  </p>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
