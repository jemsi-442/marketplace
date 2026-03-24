'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Building2, Landmark, MessagesSquare, Search, WalletMinimal } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { BookingProgressStrip } from '@/components/dashboard/booking-progress-strip';
import { StatCard } from '@/components/dashboard/stat-card';
import { BookingTimeline } from '@/components/dashboard/booking-timeline';
import { ServiceCategoryBadge } from '@/components/dashboard/service-category-badge';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ActionSummaryStrip } from '@/components/ui/action-summary-strip';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { FirstSessionState } from '@/components/ui/first-session-state';
import { FormActionDock } from '@/components/ui/form-action-dock';
import { FormValidationSummary } from '@/components/ui/form-validation-summary';
import { FormSection } from '@/components/ui/form-section';
import { FormHint } from '@/components/ui/form-hint';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { DraftStatusNote } from '@/components/ui/draft-status-note';
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

const vendorProfileSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  bio: z.string().max(1200).optional().or(z.literal('')),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  portfolioLink: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

const withdrawalSchema = z.object({
  amount_minor: z.number().int().positive('Enter a positive amount'),
  msisdn: z.string().min(8, 'Phone number is required'),
  provider: z.string().min(2, 'Provider is required'),
});

const serviceSchema = z.object({
  title: z.string().min(3, 'Service title is required'),
  description: z.string().max(1500).optional().or(z.literal('')),
  category: z.string().max(100).optional().or(z.literal('')),
  price_cents: z.number().int().positive('Enter a positive price'),
});
const messageSchema = z.object({
  content: z.string().min(2, 'Message is too short').max(2000, 'Message is too long'),
});

type VendorProfileFormValues = z.infer<typeof vendorProfileSchema>;
type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;
type ServiceFormValues = z.infer<typeof serviceSchema>;
type MessageFormValues = z.infer<typeof messageSchema>;

function getVendorBookingNextStep(booking: { escrow?: { status: string } | null }): string {
  if (!booking.escrow) {
    return 'Open the booking workspace and prepare for the protected payment stage.';
  }

  switch (booking.escrow.status) {
    case 'CREATED':
      return 'Wait for payment collection, then begin delivery when the booking becomes active.';
    case 'ACTIVE':
      return 'Use messages and the booking workspace to keep delivery moving cleanly.';
    case 'DISPUTED':
      return 'Keep evidence and delivery facts ready while admin review is pending.';
    case 'RELEASED':
      return 'Review the completed work record and move focus to the next engagement.';
    default:
      return 'Open the booking workspace to confirm the exact next move.';
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

export default function VendorDashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [withdrawalFeedback, setWithdrawalFeedback] = useState<string | null>(null);
  const [serviceFeedback, setServiceFeedback] = useState<string | null>(null);
  const [serviceSuccess, setServiceSuccess] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [messageBookingId, setMessageBookingId] = useState<number | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState<string>('All');
  const [inventoryStatus, setInventoryStatus] = useState<'all' | 'live' | 'inactive'>('all');
  const vendorProfile = useQuery({
    queryKey: ['vendor-profile-page', token],
    queryFn: () => apiClient.getVendorProfile(token ?? ''),
    enabled: Boolean(token),
  });
  const vendorTrust = useQuery({
    queryKey: ['vendor-trust-page', token],
    queryFn: () => apiClient.getVendorTrust(token ?? ''),
    enabled: Boolean(token),
  });
  const withdrawalSummary = useQuery({
    queryKey: ['withdrawal-summary', token],
    queryFn: () => apiClient.getWithdrawalSummary(token ?? '', 'TZS'),
    enabled: Boolean(token),
  });
  const withdrawals = useQuery({
    queryKey: ['withdrawals', token],
    queryFn: () => apiClient.getWithdrawals(token ?? ''),
    enabled: Boolean(token),
  });
  const services = useQuery({
    queryKey: ['services', token],
    queryFn: () => apiClient.getServices(token),
  });
  const vendorReviews = useQuery({
    queryKey: ['vendor-reviews', user?.id],
    queryFn: () => apiClient.getVendorReviews(user?.id ?? 0),
    enabled: typeof user?.id === 'number',
  });
  const vendorBookings = useQuery({
    queryKey: ['vendor-bookings', token],
    queryFn: () => apiClient.getBookings(token ?? ''),
    enabled: Boolean(token),
  });

  const form = useForm<VendorProfileFormValues>({
    resolver: zodResolver(vendorProfileSchema),
    defaultValues: {
      companyName: '',
      bio: '',
      website: '',
      portfolioLink: '',
    },
  });
  const withdrawalForm = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount_minor: 0,
      msisdn: '',
      provider: 'MPESA',
    },
  });
  const serviceForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      price_cents: 0,
    },
  });
  const messageForm = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: '',
    },
  });
  const watchedCompanyName = useWatch({ control: form.control, name: 'companyName' }) ?? '';
  const watchedWebsite = useWatch({ control: form.control, name: 'website' }) ?? '';
  const watchedPortfolioLink = useWatch({ control: form.control, name: 'portfolioLink' }) ?? '';
  const watchedBio = useWatch({ control: form.control, name: 'bio' }) ?? '';
  const watchedWithdrawalAmount = useWatch({ control: withdrawalForm.control, name: 'amount_minor' });
  const watchedWithdrawalMsisdn = useWatch({ control: withdrawalForm.control, name: 'msisdn' }) ?? '';
  const watchedWithdrawalProvider = useWatch({ control: withdrawalForm.control, name: 'provider' }) ?? '';
  const watchedServiceTitle = useWatch({ control: serviceForm.control, name: 'title' }) ?? '';
  const watchedServiceCategory = useWatch({ control: serviceForm.control, name: 'category' }) ?? '';
  const watchedServicePrice = useWatch({ control: serviceForm.control, name: 'price_cents' });
  const watchedServiceDescription = useWatch({ control: serviceForm.control, name: 'description' }) ?? '';

  useEffect(() => {
    if (vendorProfile.data?.exists) {
      form.reset({
        companyName: vendorProfile.data.company_name ?? '',
        bio: vendorProfile.data.bio ?? '',
        website: vendorProfile.data.website ?? '',
        portfolioLink: vendorProfile.data.portfolio_link ?? '',
      });
    }
  }, [form, vendorProfile.data]);

  useEffect(() => {
    const hasUnsavedDrafts =
      form.formState.isDirty ||
      withdrawalForm.formState.isDirty ||
      serviceForm.formState.isDirty;

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
  }, [form.formState.isDirty, serviceForm.formState.isDirty, withdrawalForm.formState.isDirty]);

  const upsertVendorProfile = useMutation({
    mutationFn: async (values: VendorProfileFormValues) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const payload = {
        companyName: values.companyName,
        bio: values.bio || null,
        website: values.website || null,
        portfolioLink: values.portfolioLink || null,
      };

      if (vendorProfile.data?.exists) {
        return apiClient.updateVendorProfile(token, payload);
      }

      return apiClient.createVendorProfile(token, payload);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await queryClient.invalidateQueries({ queryKey: ['vendor-profile-page'] });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to save vendor profile');
    },
  });
  const requestWithdrawal = useMutation({
    mutationFn: async (values: WithdrawalFormValues) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.requestWithdrawal(token, {
        amount_minor: values.amount_minor,
        currency: 'TZS',
        msisdn: values.msisdn,
        provider: values.provider.toUpperCase(),
      });
    },
    onSuccess: async (response) => {
      setWithdrawalFeedback(`Withdrawal submitted: ${response.reference}`);
      withdrawalForm.reset({
        amount_minor: 0,
        msisdn: '',
        provider: 'MPESA',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['withdrawal-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['withdrawals'] }),
      ]);
    },
    onError: (error) => {
      setWithdrawalFeedback(error instanceof Error ? error.message : 'Unable to request withdrawal');
    },
  });
  const upsertService = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const payload = {
        title: values.title,
        description: values.description || null,
        category: values.category || null,
        price_cents: values.price_cents,
      };

      if (editingServiceId) {
        return apiClient.updateService(token, editingServiceId, payload);
      }

      return apiClient.createService(token, payload);
    },
    onSuccess: async (response) => {
      setServiceFeedback(response.message);
      setServiceSuccess(
        editingServiceId
          ? 'Service updated. Buyers will now see the latest scope, price, and category.'
          : 'Service created. It is now available in your service inventory for review and follow-up.',
      );
      setEditingServiceId(null);
      serviceForm.reset({
        title: '',
        description: '',
        category: '',
        price_cents: 0,
      });
      await queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (error) => {
      setServiceSuccess(null);
      setServiceFeedback(error instanceof Error ? error.message : 'Unable to save service');
    },
  });
  const deleteService = useMutation({
    mutationFn: async (serviceId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.deleteService(token, serviceId);
    },
    onSuccess: async (response) => {
      setServiceFeedback(response.message);
      setServiceSuccess('Service disabled. It remains in your records, but buyers should no longer treat it as a live offer.');
      await queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (error) => {
      setServiceSuccess(null);
      setServiceFeedback(error instanceof Error ? error.message : 'Unable to disable service');
    },
  });
  const sendMessage = useMutation({
    mutationFn: async (values: MessageFormValues) => {
      if (!token || !messageBookingId) {
        throw new Error('Booking conversation target missing');
      }

      const booking = vendorBookings.data?.find((item) => item.id === messageBookingId);
      const receiverId = booking?.client_id;

      if (!receiverId) {
        throw new Error('Unable to resolve client recipient for this booking');
      }

      return apiClient.sendMessage(token, {
        receiverId,
        content: values.content,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
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
      setFeedback(error instanceof Error ? error.message : 'Unable to send message');
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setFeedback(null);
    await upsertVendorProfile.mutateAsync(values);
  });
  const handleWithdrawalSubmit = withdrawalForm.handleSubmit(async (values) => {
    setWithdrawalFeedback(null);
    await requestWithdrawal.mutateAsync(values);
  });
  const handleServiceSubmit = serviceForm.handleSubmit(async (values) => {
    setServiceFeedback(null);
    await upsertService.mutateAsync(values);
  });
  const handleMessageSubmit = messageForm.handleSubmit(async (values) => {
    setFeedback(null);
    await sendMessage.mutateAsync(values);
  });
  const vendorServices = useMemo(
    () => services.data?.filter((service) => service.vendor_user_id === user?.id) ?? [],
    [services.data, user?.id],
  );
  const filteredVendorServices = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();

    return vendorServices.filter((service) => {
      const matchesStatus =
        inventoryStatus === 'all' ||
        (inventoryStatus === 'live' && service.is_active) ||
        (inventoryStatus === 'inactive' && !service.is_active);
      const matchesCategory = inventoryCategory === 'All' || (service.category ?? '') === inventoryCategory;
      const searchable = `${service.title} ${service.description ?? ''} ${service.category ?? ''}`.toLowerCase();
      const matchesSearch = query.length === 0 || searchable.includes(query);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [inventoryCategory, inventorySearch, inventoryStatus, vendorServices]);
  const engagementCount = vendorBookings.data?.length ?? 0;
  const liveServiceCount = vendorServices.length;
  const inactiveServiceCount = vendorServices.filter((service) => !service.is_active).length;
  const completedReviewCount = vendorReviews.data?.length ?? 0;
  const hasInventoryFilters = inventorySearch.trim().length > 0 || inventoryCategory !== 'All' || inventoryStatus !== 'all';
  const isVendorFirstSession =
    !vendorProfile.isLoading &&
    !vendorProfile.isError &&
    !services.isLoading &&
    !services.isError &&
    !vendorBookings.isLoading &&
    !vendorBookings.isError &&
    !withdrawals.isLoading &&
    !withdrawals.isError &&
    !vendorProfile.data?.exists &&
    vendorServices.length === 0 &&
    engagementCount === 0 &&
    (withdrawals.data?.length ?? 0) === 0;
  const inventoryStateMessage = inventorySearch.trim().length > 0
    ? `Showing ${filteredVendorServices.length} service result${filteredVendorServices.length === 1 ? '' : 's'} for "${inventorySearch.trim()}" in the ${inventoryStatus} view.`
    : inventoryCategory === 'All'
      ? `Showing ${filteredVendorServices.length} service result${filteredVendorServices.length === 1 ? '' : 's'} in the ${inventoryStatus} inventory view.`
      : `Showing ${filteredVendorServices.length} service result${filteredVendorServices.length === 1 ? '' : 's'} in ${inventoryCategory} within the ${inventoryStatus} inventory view.`;
  const vendorProfileReady = Boolean(
    watchedCompanyName.trim() &&
      (watchedWebsite.trim() || watchedPortfolioLink.trim() || watchedBio.trim().length >= 60),
  );
  const withdrawalReady = Boolean(
    Number(watchedWithdrawalAmount) > 0 &&
      watchedWithdrawalMsisdn.trim() &&
      watchedWithdrawalProvider.trim(),
  );
  const serviceDraftReady = Boolean(
    watchedServiceTitle.trim() &&
      watchedServiceCategory.trim() &&
      Number(watchedServicePrice) > 0 &&
      watchedServiceDescription.trim().length >= 40,
  );
  const vendorProfileErrors = getFormErrorMessages(form.formState.errors as Record<string, unknown>);
  const withdrawalErrors = getFormErrorMessages(withdrawalForm.formState.errors as Record<string, unknown>);
  const serviceErrors = getFormErrorMessages(serviceForm.formState.errors as Record<string, unknown>);
  const activeDeliveryCount = vendorBookings.data?.filter((booking) => booking.escrow?.status === 'ACTIVE').length ?? 0;
  const availableBalance = withdrawalSummary.data?.balance_minor ?? 0;
  const vendorPriority = !vendorProfile.data?.exists
    ? {
        title: 'Complete your business profile before pushing harder on sales',
        description: 'A clear business identity is still the safest first step because buyers rely on it to trust the listings and delivery team behind them.',
        tone: 'market' as const,
      }
    : activeDeliveryCount
      ? {
          title: 'Live delivery needs the first block of attention today',
          description: 'There is protected work in motion, so respond to delivery progress and booking follow-up before editing listings or requesting payout.',
          tone: 'communication' as const,
        }
      : availableBalance > 0
        ? {
            title: 'Visible funds are ready for payout review',
            description: 'Your wallet already shows available value, so review payout readiness next if the receiving wallet details are final.',
            tone: 'finance' as const,
          }
        : !liveServiceCount
          ? {
              title: 'You are ready to publish the first live offer',
              description: 'Use the inventory form to create a clear listing with scope, category, and price before waiting for new engagement to appear.',
              tone: 'market' as const,
            }
          : {
              title: 'Refining your studio will improve the next buyer decision',
              description: 'Your profile and listings are already present, so the best next move is usually clearer positioning, cleaner scope, or sharper inactive-offer cleanup.',
              tone: 'guidance' as const,
            };

  const jumpToVendorSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <DashboardShell
      title="Service studio"
      subtitle="Manage your service listings, business profile, reviews, payments, and active work from one secure WOLFIX workspace."
      mobileQuickActions={
        <div className="grid grid-cols-3 gap-2">
          <Link href="#vendor-business-setup">
            <Button size="sm" variant="ghost" className="w-full">Profile</Button>
          </Link>
          <Link href="#vendor-service-inventory">
            <Button size="sm" className="w-full">Services</Button>
          </Link>
          <Link href="#vendor-live-offers">
            <Button size="sm" variant="ghost" className="w-full">Delivery</Button>
          </Link>
        </div>
      }
    >
      <div className="animate-fade-up">
        <WorkspaceGuide
          eyebrow="How to use service studio"
          title="This page is for preparing your presence and managing live delivery"
          description="Work through this page in a simple order: make your business profile clear, keep listings accurate, respond to active work, then manage withdrawals only after earnings are available."
          points={[
            'Finish your business profile first so clients understand who they are hiring.',
            'Keep service listings specific, priced clearly, and easy to compare.',
            'Use engagement and inbox areas when a booking needs delivery follow-up.',
            'Treat withdrawals as the final step after payment activity is already visible.',
          ]}
          tip="If you feel lost, start with profile readiness, then check whether a live booking is waiting for action."
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '20ms' }}>
        <WorkspaceIdentityBanner
          tone="vendor"
          title="This workspace is built for running your studio, fulfilling work, and managing earnings"
          description="Everything here is arranged around the provider journey: present the business clearly, publish strong offers, respond to live delivery, then handle withdrawals only after earnings are visible."
          highlights={[
            'Profile clarity comes before aggressive listing growth.',
            'Live engagements should win attention before studio edits.',
            'Payout decisions should happen after delivery and settlement are visible.',
          ]}
          actions={
            <>
              <Button size="sm" onClick={() => jumpToVendorSection('vendor-business-setup')}>
                Open business setup
              </Button>
              <Button size="sm" variant="ghost" onClick={() => jumpToVendorSection('vendor-live-offers')}>
                Open delivery work
              </Button>
            </>
          }
        />
      </div>

      {isVendorFirstSession ? (
        <FirstSessionState
          title="Your studio is ready for first setup"
          description="This account does not have a business profile, live offer, or delivery record yet. Set up the business identity first, publish one strong service, then come back here when bookings and earnings begin to move."
          steps={[
            {
              label: 'Complete the business profile',
              detail: 'Give buyers enough context to trust the team or business behind the service listing.',
              href: '#vendor-business-setup',
            },
            {
              label: 'Publish the first live service',
              detail: 'Start with one clear offer, one category, and one price before expanding the studio.',
              href: '#vendor-service-inventory',
            },
            {
              label: 'Watch for bookings and payout readiness',
              detail: 'After the first booking lands, this workspace becomes the place to manage delivery, trust, and earnings.',
              href: '#vendor-payout-readiness',
            },
          ]}
          actions={
            <>
              <Button size="sm" onClick={() => jumpToVendorSection('vendor-business-setup')}>
                Complete profile
              </Button>
              <Button size="sm" variant="ghost" onClick={() => jumpToVendorSection('vendor-service-inventory')}>
                Create first listing
              </Button>
            </>
          }
        />
      ) : null}

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '40ms' }}>
        <WorkflowSteps
          eyebrow="Typical provider path"
          title="The cleanest way to use this workspace"
          steps={[
            { title: 'Prepare profile', description: 'Add business details so buyers can trust the account quickly.' },
            { title: 'Publish services', description: 'Create or refine listings with clear scope, category, and pricing.' },
            { title: 'Handle delivery', description: 'Respond to bookings, messages, and ongoing service work in the right order.' },
            { title: 'Manage earnings', description: 'Review wallet activity and request withdrawal only when funds are available.' },
          ]}
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '80ms' }}>
        <SectionNavigator
          className="mt-6"
          title="Jump to the studio section you need"
          description="Use this navigator when you already know whether the next task is profile, payout, services, or live delivery."
          items={[
            { href: '#vendor-studio-pulse', label: 'Studio pulse', helper: 'Read the current operating picture.' },
            { href: '#vendor-business-setup', label: 'Business setup', helper: 'Update public business identity.' },
            { href: '#vendor-payout-readiness', label: 'Payout readiness', helper: 'Handle balance and withdrawals.' },
            { href: '#vendor-service-inventory', label: 'Service inventory', helper: 'Create or refine listings.' },
            { href: '#vendor-live-offers', label: 'Live offers', helper: 'Open and manage current listings.' },
          ]}
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '120ms' }}>
        <PriorityBanner
          title={vendorPriority.title}
          description={vendorPriority.description}
          tone={vendorPriority.tone}
          actions={
            <>
              <Button
                size="sm"
                variant={!vendorProfile.data?.exists ? 'primary' : 'ghost'}
                onClick={() => jumpToVendorSection('vendor-business-setup')}
              >
                Complete profile
              </Button>
              <Button
                size="sm"
                variant={activeDeliveryCount ? 'primary' : 'ghost'}
                onClick={() => jumpToVendorSection('vendor-active-projects')}
              >
                Delivery work
              </Button>
              <Button
                size="sm"
                variant={availableBalance > 0 ? 'primary' : 'ghost'}
                onClick={() => jumpToVendorSection('vendor-payout-readiness')}
              >
                Review payout
              </Button>
              <Button
                size="sm"
                variant={!liveServiceCount || inactiveServiceCount ? 'primary' : 'ghost'}
                onClick={() => jumpToVendorSection('vendor-service-inventory')}
              >
                Update listings
              </Button>
            </>
          }
        />
      </div>

      <div className="animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '150ms' }}>
        <ActionSummaryStrip
          className="mt-6"
          title="What matters in service studio right now"
          items={[
            {
              eyebrow: 'Current state',
              value: vendorProfile.data?.exists ? 'Business ready' : 'Profile missing',
              detail: vendorProfile.data?.exists
                ? `${liveServiceCount} live offer${liveServiceCount === 1 ? '' : 's'} and ${engagementCount} active engagement${engagementCount === 1 ? '' : 's'} are visible from this workspace.`
                : 'Start with the business profile so buyers can understand who is behind the listings.',
              icon: <Building2 className="size-5" />,
              tone: 'guidance',
            },
            {
              eyebrow: 'Next safe move',
              value: engagementCount
                ? 'Handle delivery'
                : liveServiceCount
                  ? 'Refine offers'
                  : 'Create first service',
              detail: engagementCount
                ? 'Check live offers and booking activity before changing listings or requesting payouts.'
                : liveServiceCount
                  ? 'Use the inventory and review signals below to tighten clarity, scope, and pricing.'
                  : 'Open the service inventory section and publish the first buyer-facing offer with clear category and price.',
              icon: <MessagesSquare className="size-5" />,
              tone: 'activity',
            },
            {
              eyebrow: 'Continue here',
              value: withdrawalSummary.data?.balance_minor ? 'Payout readiness' : 'Service inventory',
              detail: withdrawalSummary.data?.balance_minor
                ? 'Move to the payout section when earnings are already visible and a withdrawal is justified.'
                : 'Stay in service inventory until the profile and offers are clear enough to attract and support bookings.',
              icon: <Landmark className="size-5" />,
              tone: 'finance',
            },
          ]}
        />
      </div>

      <div className="mt-6 animate-fade-up-delayed" style={{ ['--stagger-delay' as string]: '160ms' }}>
        <PulseMetricsStrip
          title="Read the studio pulse before editing or paying out"
          description="These three counters help you decide whether today is mainly about listings, delivery work, or funds already visible in the wallet."
          items={[
            {
              label: 'Live offers',
              value: String(liveServiceCount),
              detail: liveServiceCount ? 'These listings are the offers buyers can currently act on.' : 'No buyer-facing service is live right now.',
              icon: <Building2 className="size-5" />,
              variant: 'market',
            },
            {
              label: 'Active engagements',
              value: String(engagementCount),
              detail: engagementCount ? 'These bookings are the best signal of what delivery work needs attention next.' : 'No booking is currently waiting inside your live delivery flow.',
              icon: <MessagesSquare className="size-5" />,
              variant: 'communication',
            },
            {
              label: 'Wallet visibility',
              value: withdrawalSummary.data ? String(withdrawalSummary.data.balance_minor) : '--',
              detail: withdrawalSummary.data ? `Current available balance in ${withdrawalSummary.data.currency} minor units.` : 'Balance appears here when payout data becomes available for this account.',
              icon: <WalletMinimal className="size-5" />,
              variant: 'finance',
            },
          ]}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard eyebrow="Profile status" value={vendorProfile.data?.exists ? 'Live' : 'Missing'} detail={vendorProfile.data?.exists ? vendorProfile.data.company_name ?? 'Business profile is linked.' : 'Complete your business profile to strengthen marketplace presence.'} icon={<Building2 className="size-8" />} variant="market" />
        <StatCard eyebrow="Trust path" value={vendorTrust.data ? `${vendorTrust.data.calculated_trust_score}` : 'Composable'} detail={vendorTrust.data ? `Risk ${vendorTrust.data.risk_level} · Rating ${vendorTrust.data.average_rating.toFixed(1)}` : 'Reputation signals and quality alerts will appear here as your activity grows.'} icon={<BadgeCheck className="size-8" />} variant="risk" />
        <StatCard eyebrow="Wallet status" value={withdrawalSummary.data ? String(withdrawalSummary.data.balance_minor) : 'Ready'} detail={withdrawalSummary.data ? `Available in ${withdrawalSummary.data.currency}` : 'Payment activity and withdrawal readiness will appear here.'} icon={<WalletMinimal className="size-8" />} variant="finance" />
      </div>

      <Card id="vendor-studio-pulse" variant="guidance" className="mt-6 scroll-mt-24">
        <SectionHeader
          eyebrow="Studio pulse"
          title="Keep the next vendor move visible"
          description="This strip gives you quick context before you move into listings, payouts, or active delivery."
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
                setInventorySearch('');
                setInventoryCategory('All');
                setInventoryStatus('live');
                jumpToVendorSection('vendor-live-offers');
              }}
            >
              Show live only
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                jumpToVendorSection('vendor-payout-readiness');
              }}
            >
              Show payout ready
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingServiceId(null);
                setInventorySearch('');
                setInventoryCategory('All');
                setInventoryStatus('all');
                jumpToVendorSection('vendor-service-inventory');
              }}
            >
              Create listing
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                jumpToVendorSection('vendor-active-projects');
              }}
            >
              Delivery work
            </Button>
          </div>
          <div className="rounded-[22px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(18,27,90,0.68),rgba(37,48,132,0.48))] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Live services</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{liveServiceCount}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Listings currently visible in your workspace.</p>
          </div>
          <div className="rounded-[22px] border border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.68),rgba(15,63,120,0.48))] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Active engagements</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{engagementCount}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Bookings available for delivery follow-up.</p>
          </div>
          <div className="rounded-[22px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.62),rgba(108,36,74,0.44))] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Review signals</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">{completedReviewCount}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Feedback already attached to your delivered work.</p>
          </div>
        </div>
      </Card>

      <Card variant="activity" className="mt-6">
        <SectionHeader
          eyebrow="Business profile"
          title="Profile readiness"
          description="Confirm what the marketplace currently knows about your business identity."
          variant="activity"
          sticky
        />
        <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5 text-sm leading-7 text-[var(--text-secondary)]">
          {vendorProfile.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : null}
          {vendorProfile.isError ? `Profile could not be loaded: ${vendorProfile.error instanceof Error ? vendorProfile.error.message : 'Unknown error'}` : null}
          {vendorProfile.data ? (
            <div className="space-y-2">
              <p><span className="text-[var(--text-primary)]">exists:</span> {String(vendorProfile.data.exists)}</p>
              <p><span className="text-[var(--text-primary)]">company_name:</span> {vendorProfile.data.company_name ?? 'n/a'}</p>
              <p><span className="text-[var(--text-primary)]">website:</span> {vendorProfile.data.website ?? 'n/a'}</p>
              <p><span className="text-[var(--text-primary)]">portfolio_link:</span> {vendorProfile.data.portfolio_link ?? 'n/a'}</p>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card id="vendor-business-setup" variant="market" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Business setup"
          title={vendorProfile.data?.exists ? 'Update business profile' : 'Create business profile'}
          description="Use this form to make your studio look complete and trustworthy before clients engage."
          variant="market"
          sticky
          actions={
            <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {vendorProfile.data?.exists ? 'existing profile' : 'new profile'}
            </div>
          }
        />

        <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[rgba(78,137,255,0.08)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-secondary)]">Recommended WOLFIX lanes</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {wolfixMarketplaceLanes.map((lane) => (
              <span key={lane} className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                {lane}
              </span>
            ))}
          </div>
        </div>

        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
          <DraftStatusNote
            dirty={form.formState.isDirty}
            isSaving={upsertVendorProfile.isPending}
            pristineMessage="The business profile currently matches the last saved state."
            dirtyMessage="This profile has unsaved edits. Save before leaving if these business details should remain public."
            savingMessage="Saving the latest business profile changes..."
          />
          <FormValidationSummary
            title="The business profile still needs a few corrections"
            errors={vendorProfileErrors}
          />
          <FormSection
            step="01"
            title="Identity buyers should recognise"
            description="Start with the business name that should appear everywhere this account is seen."
            tone="market"
          >
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="companyName">Company name</label>
              <input id="companyName" placeholder="WOLFIX partner studio or digital brand" {...form.register('companyName')} />
              <FormHint text="Use the public business name clients should recognise across listings, messages, and payout records." />
              {form.formState.errors.companyName ? <p className="text-sm text-rose-300">{form.formState.errors.companyName.message}</p> : null}
            </div>
          </FormSection>

          <FormSection
            step="02"
            title="Proof links"
            description="Add the links buyers can use to verify your business presence and work samples."
            tone="activity"
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]" htmlFor="website">Website</label>
                <input id="website" placeholder="https://company.example" {...form.register('website')} />
                <FormHint text="Add the main company site clients can use to verify your business presence." />
                {form.formState.errors.website ? <p className="text-sm text-rose-300">{form.formState.errors.website.message}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]" htmlFor="portfolioLink">Portfolio link</label>
                <input id="portfolioLink" placeholder="https://portfolio.example" {...form.register('portfolioLink')} />
                <FormHint text="Use a portfolio page with work samples that match the services you plan to sell here." />
                {form.formState.errors.portfolioLink ? <p className="text-sm text-rose-300">{form.formState.errors.portfolioLink.message}</p> : null}
              </div>
            </div>
          </FormSection>

          <FormSection
            step="03"
            title="Business story"
            description="Explain what you do, who you serve, and why your delivery is dependable."
            tone="guidance"
          >
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="bio">Bio</label>
              <textarea id="bio" rows={6} placeholder="Describe your digital expertise, delivery strengths, industries served, and outcomes you create for clients." {...form.register('bio')} />
              <FormHint text="Focus on expertise, delivery strengths, industries served, and the outcomes buyers should expect." />
              {form.formState.errors.bio ? <p className="text-sm text-rose-300">{form.formState.errors.bio.message}</p> : null}
            </div>
          </FormSection>

          {vendorProfileReady ? (
            <InlineStateNote
              tone="success"
              message="This profile draft already gives buyers enough context to recognise the business and judge credibility."
            />
          ) : (
            <InlineStateNote
              message="A profile becomes easier to trust once the business name is paired with at least one proof link or a fuller business story."
            />
          )}

          {feedback ? <div><FeedbackBanner message={feedback} tone="info" onDismiss={() => setFeedback(null)} /></div> : null}

          <FormActionDock
            title="Profile actions"
            hint="Save once the business identity and proof links are clear enough for buyers to trust quickly."
          >
            <Button type="submit" disabled={upsertVendorProfile.isPending}>
              {upsertVendorProfile.isPending
                ? 'Saving profile...'
                : vendorProfile.data?.exists
                  ? 'Update business profile'
                  : 'Create business profile'}
            </Button>
          </FormActionDock>
        </form>
      </Card>

      <Card id="vendor-payout-readiness" variant="finance" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Wallet and payouts"
          title="Payout readiness"
          description="Review current balance, submit withdrawal requests, and keep payout history visible."
          variant="finance"
          sticky
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Available balance</p>
            <p className="mt-3 font-display text-4xl text-[var(--text-primary)]">
              {withdrawalSummary.data ? withdrawalSummary.data.balance_minor : '--'}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{withdrawalSummary.data?.currency ?? 'TZS'} minor units</p>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Latest withdrawal</p>
            <p className="mt-3 text-lg text-[var(--text-primary)]">
              {withdrawalSummary.data?.latest_withdrawal?.reference ?? 'No withdrawals yet'}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {withdrawalSummary.data?.latest_withdrawal?.status ?? 'Request one below to start payout flow.'}
            </p>
          </div>
        </div>

        <form className="mt-6 grid gap-5" onSubmit={handleWithdrawalSubmit}>
          <DraftStatusNote
            dirty={withdrawalForm.formState.isDirty}
            isSaving={requestWithdrawal.isPending}
            pristineMessage="No payout request is being drafted right now."
            dirtyMessage="This payout request has unsaved details. Submit only after the amount and receiving wallet are final."
            savingMessage="Submitting the payout request..."
          />
          <FormValidationSummary
            title="The payout request still needs a few corrections"
            errors={withdrawalErrors}
          />
          <FormSection
            step="01"
            title="Choose payout amount"
            description="Use the current wallet balance above, then decide the exact amount that should move out."
            tone="finance"
          >
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="amount_minor">Amount minor</label>
              <input id="amount_minor" type="number" min="1" {...withdrawalForm.register('amount_minor', { valueAsNumber: true })} />
              <FormHint text="Enter the payout amount in minor units, using the balance shown above as your working reference." />
              {withdrawalForm.formState.errors.amount_minor ? <p className="text-sm text-rose-300">{withdrawalForm.formState.errors.amount_minor.message}</p> : null}
            </div>
          </FormSection>

          <FormSection
            step="02"
            title="Pick the receiving wallet"
            description="Set the exact number and provider that should receive the payout."
            tone="activity"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]" htmlFor="msisdn">MSISDN</label>
                <input id="msisdn" placeholder="2557XXXXXXXX" {...withdrawalForm.register('msisdn')} />
                <FormHint text="Use the business wallet number that should receive this payout." />
                {withdrawalForm.formState.errors.msisdn ? <p className="text-sm text-rose-300">{withdrawalForm.formState.errors.msisdn.message}</p> : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]" htmlFor="provider">Provider</label>
                <select id="provider" {...withdrawalForm.register('provider')}>
                  <option value="MPESA">M-Pesa</option>
                  <option value="AIRTEL">Airtel Money</option>
                  <option value="YAS">YAS</option>
                </select>
                <FormHint text="Pick the provider connected to that wallet number to avoid failed payout routing." />
                {withdrawalForm.formState.errors.provider ? <p className="text-sm text-rose-300">{withdrawalForm.formState.errors.provider.message}</p> : null}
              </div>
            </div>
          </FormSection>

          {withdrawalReady ? (
            <InlineStateNote tone="success" message="The payout request looks complete. Submit only when the amount and receiving wallet are final." />
          ) : (
            <InlineStateNote message="Payouts become safer when the amount, wallet number, and provider are all confirmed before submission." />
          )}

          {withdrawalFeedback ? <FeedbackBanner message={withdrawalFeedback} tone="info" onDismiss={() => setWithdrawalFeedback(null)} /> : null}

          <FormActionDock
            title="Payout actions"
            hint="Submit only after the amount and receiving wallet match the payout you actually want to move."
          >
            <Button type="submit" disabled={requestWithdrawal.isPending}>
              {requestWithdrawal.isPending ? 'Submitting withdrawal...' : 'Request withdrawal'}
            </Button>
          </FormActionDock>
        </form>

        <div className="mt-8 space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Withdrawal history</p>
          {withdrawals.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : null}
          {withdrawals.isError ? (
            <FeedbackBanner message={withdrawals.error instanceof Error ? withdrawals.error.message : 'Unable to load withdrawals'} tone="danger" />
          ) : null}
          {withdrawals.data?.map((withdrawal) => (
            <div key={withdrawal.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-sm text-[var(--text-secondary)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[var(--text-primary)]">{withdrawal.reference}</p>
                  <p className="mt-1">{withdrawal.amount_minor} {withdrawal.currency} · {withdrawal.provider}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{withdrawal.created_at}</p>
                </div>
                <StatusBadge
                  label={withdrawal.status}
                  tone={withdrawal.status === 'paid' ? 'success' : withdrawal.status === 'failed' ? 'danger' : 'warning'}
                />
              </div>
              {withdrawal.failure_reason ? <p className="mt-3 text-rose-300">Reason: {withdrawal.failure_reason}</p> : null}
            </div>
          ))}
          {!withdrawals.isLoading && !withdrawals.data?.length ? (
            <EmptyState
              icon={<Landmark className="size-5" />}
              title="No withdrawals yet"
              description="Your payout history will appear here once the first withdrawal request is submitted."
            />
          ) : null}
        </div>
      </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card id="vendor-service-inventory" variant="market" className="scroll-mt-24">
          <SectionHeader
            eyebrow="Service inventory"
            title={editingServiceId ? 'Edit service offer' : 'Create service offer'}
            description="Keep service information structured so clients can understand the offer quickly."
            variant="market"
            sticky
            actions={
              <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                {vendorServices.length} active services
              </div>
            }
          />

          <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[rgba(78,137,255,0.08)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-secondary)]">WOLFIX digital categories</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {wolfixServiceCategories.map((category) => (
                <span key={category} className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  {category}
                </span>
              ))}
            </div>
          </div>

          <form className="mt-6 grid gap-5" onSubmit={handleServiceSubmit}>
            <DraftStatusNote
              dirty={serviceForm.formState.isDirty}
              isSaving={upsertService.isPending}
              pristineMessage="The listing form currently matches the last saved or empty state."
              dirtyMessage="This listing has unsaved edits. Save before leaving if the offer details should stay updated."
              savingMessage="Saving the latest service listing changes..."
            />
            <FormValidationSummary
              title="The service listing still needs a few corrections"
              errors={serviceErrors}
            />
            <FormSection
              step="01"
              title="Name the offer clearly"
              description="Start with the service title buyers should immediately understand and search for."
              tone="market"
            >
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]" htmlFor="service-title">Title</label>
                <input id="service-title" placeholder="Mobile app design sprint" {...serviceForm.register('title')} />
                <FormHint text="Name the offer the way a buyer would search for it, with one clear deliverable or outcome." />
                {serviceForm.formState.errors.title ? <p className="text-sm text-rose-300">{serviceForm.formState.errors.title.message}</p> : null}
              </div>
            </FormSection>

            <FormSection
              step="02"
              title="Place and price the service"
              description="Choose the right category and set a starting price the buyer can interpret quickly."
              tone="activity"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-[var(--text-secondary)]" htmlFor="service-category">Category</label>
                  <select id="service-category" {...serviceForm.register('category')}>
                    <option value="">Select a WOLFIX category</option>
                    {wolfixServiceCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                    <option value="Other Digital Service">Other Digital Service</option>
                  </select>
                  <FormHint text="Choose the closest WOLFIX lane so buyers and internal matching can place the service correctly." />
                  {serviceForm.formState.errors.category ? <p className="text-sm text-rose-300">{serviceForm.formState.errors.category.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[var(--text-secondary)]" htmlFor="service-price">Price minor units</label>
                  <input id="service-price" type="number" min="1" {...serviceForm.register('price_cents', { valueAsNumber: true })} />
                  <FormHint text="Use minor units and price the entry scope clearly so the buyer understands the starting commitment." />
                  {serviceForm.formState.errors.price_cents ? <p className="text-sm text-rose-300">{serviceForm.formState.errors.price_cents.message}</p> : null}
                </div>
              </div>
            </FormSection>

            <FormSection
              step="03"
              title="Describe scope and outcome"
              description="Write the delivery boundaries so the buyer does not need to guess what is included."
              tone="guidance"
            >
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]" htmlFor="service-description">Description</label>
                <textarea id="service-description" rows={5} placeholder="Describe the delivery scope, revision policy, tools used, timelines, and business outcomes." {...serviceForm.register('description')} />
                <FormHint text="Spell out scope, delivery timeline, revisions, and the business outcome so buyers do not need to guess." />
                {serviceForm.formState.errors.description ? <p className="text-sm text-rose-300">{serviceForm.formState.errors.description.message}</p> : null}
              </div>
            </FormSection>

            {serviceDraftReady ? (
              <InlineStateNote tone="success" message="This service draft already has enough structure for a buyer to judge fit, price, and scope quickly." />
            ) : (
              <InlineStateNote message="A strong listing usually needs a clear title, a category, a price, and a description that explains scope in plain language." />
            )}

            {serviceFeedback ? <FeedbackBanner message={serviceFeedback} tone="info" onDismiss={() => setServiceFeedback(null)} /> : null}

            <FormActionDock
              title="Listing actions"
              hint="Save when the title, lane, price, and scope read clearly enough that a buyer does not need to guess."
            >
              <Button type="submit" disabled={upsertService.isPending}>
                {upsertService.isPending ? 'Saving service...' : editingServiceId ? 'Update service' : 'Create service'}
              </Button>
              {editingServiceId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingServiceId(null);
                    setServiceSuccess(null);
                    serviceForm.reset({
                      title: '',
                      description: '',
                      category: '',
                      price_cents: 0,
                    });
                  }}
                >
                  Cancel edit
                </Button>
              ) : null}
            </FormActionDock>
          </form>
        </Card>

        <Card id="vendor-live-offers" variant="activity" className="scroll-mt-24">
          <SectionHeader
            eyebrow="Your service listings"
            title="Manage live offers"
            description="Edit, disable, or jump into a service workspace without leaving this page."
            variant="activity"
            sticky
          />
          <div className="mt-5 grid gap-4 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(16,38,48,0.76),rgba(12,29,37,0.56))] p-5">
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="inventory-search">Search your services</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  id="inventory-search"
                  value={inventorySearch}
                  onChange={(event) => setInventorySearch(event.target.value)}
                  placeholder="Search titles, categories, or scope..."
                  className="pl-11"
                />
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Status view</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All services' },
                  { value: 'live', label: 'Live only' },
                  { value: 'inactive', label: 'Inactive only' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setInventoryStatus(option.value as 'all' | 'live' | 'inactive')}
                    className={
                      inventoryStatus === option.value
                        ? 'rounded-full border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-strong)]'
                        : 'rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]'
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Category</p>
              <div className="flex flex-wrap gap-2">
                {['All', ...wolfixServiceCategories].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setInventoryCategory(category)}
                    className={
                      inventoryCategory === category
                        ? 'rounded-full border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-strong)]'
                        : 'rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]'
                    }
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <InlineStateNote message={inventoryStateMessage} />
              {hasInventoryFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setInventorySearch('');
                    setInventoryCategory('All');
                    setInventoryStatus('all');
                  }}
                >
                  Reset inventory view
                </Button>
              ) : null}
            </div>
            {serviceSuccess ? <InlineStateNote tone="success" message={serviceSuccess} /> : null}
          </div>
          <div className="mt-5 space-y-4">
            {services.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : null}
            {services.isError ? (
              <FeedbackBanner message={services.error instanceof Error ? services.error.message : 'Unable to load services'} tone="danger" />
            ) : null}
            {filteredVendorServices.map((service, index) => (
              <div
                key={service.id}
                className="rounded-[22px] border border-[rgba(123,165,255,0.2)] bg-[linear-gradient(180deg,rgba(12,35,91,0.62),rgba(18,64,134,0.42))] p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(0,0,0,0.24)] animate-fade-up-delayed"
                style={{ ['--stagger-delay' as string]: `${index * 45}ms` }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-display text-xl text-[var(--text-primary)]">{service.title}</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{service.description ?? 'No description yet.'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <StatusBadge label={service.is_active ? 'live' : 'inactive'} tone={service.is_active ? 'success' : 'warning'} />
                      <ServiceCategoryBadge category={service.category} />
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{service.price_cents} minor units</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/dashboard/services/${service.id}`}>
                      <Button size="sm" variant="ghost">Open service</Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingServiceId(service.id);
                        setServiceFeedback(null);
                        setServiceSuccess(null);
                        serviceForm.reset({
                          title: service.title,
                          description: service.description ?? '',
                          category: service.category ?? '',
                          price_cents: service.price_cents,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setServiceFeedback(null);
                        setServiceSuccess(null);
                        deleteService.mutate(service.id);
                      }}
                      disabled={deleteService.isPending}
                    >
                      Disable
                    </Button>
                  </div>
                </div>
                <NextActionHint
                  label="Open the full service workspace for deeper review, or edit this listing here when the offer needs clearer scope or pricing."
                  action={
                    service.is_active ? (
                      <Link href={`/dashboard/services/${service.id}`}>
                        <Button size="sm" variant="ghost">Open live listing</Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingServiceId(service.id);
                          setServiceFeedback(null);
                          setServiceSuccess(null);
                          serviceForm.reset({
                            title: service.title,
                            description: service.description ?? '',
                            category: service.category ?? '',
                            price_cents: service.price_cents,
                          });
                        }}
                      >
                        Rework listing
                      </Button>
                    )
                  }
                />
              </div>
            ))}
            {!services.isLoading && !vendorServices.length ? (
              <EmptyState
                icon={<Building2 className="size-5" />}
                title="No active services yet"
                description="Create your first service offer with a clear title, category, price, and description so buyers understand it quickly."
              />
            ) : null}
            {!services.isLoading && Boolean(vendorServices.length) && !filteredVendorServices.length ? (
              <EmptyState
                icon={<Search className="size-5" />}
                title="No services match this inventory view"
                description="Reset the inventory search or filters to reopen the full service list."
                action={
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setInventorySearch('');
                      setInventoryCategory('All');
                      setInventoryStatus('all');
                    }}
                  >
                    Clear inventory filters
                  </Button>
                }
              />
            ) : null}
          </div>
        </Card>
      </div>

      <Card id="vendor-active-projects" variant="communication" className="mt-6 scroll-mt-24">
        <SectionHeader
          eyebrow="Active projects"
          title="Coordinate delivery work"
          description="Open each workspace, message the client, and keep progress visible across live bookings."
          variant="communication"
        />
        <div className="mt-5 space-y-4">
          {vendorBookings.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : null}
          {vendorBookings.isError ? (
            <FeedbackBanner message={vendorBookings.error instanceof Error ? vendorBookings.error.message : 'Unable to load project activity'} tone="danger" />
          ) : null}
          {vendorBookings.data?.map((booking, index) => (
            <div
              key={booking.id}
              className="rounded-[22px] border border-[rgba(124,194,255,0.2)] bg-[linear-gradient(180deg,rgba(8,42,86,0.62),rgba(15,63,120,0.42))] p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(0,0,0,0.24)] animate-fade-up-delayed"
              style={{ ['--stagger-delay' as string]: `${index * 55}ms` }}
            >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-display text-xl text-[var(--text-primary)]">{booking.service_title}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge label={booking.status} tone={getBookingStatusTone(booking.status)} />
                    {booking.escrow ? <StatusBadge label={booking.escrow.status} tone={getEscrowStatusTone(booking.escrow.status)} /> : null}
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{booking.created_at}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/dashboard/bookings/${booking.id}`}>
                      <Button size="sm" variant="ghost">Open workspace</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMessageBookingId(booking.id);
                        setFeedback(null);
                      }}
                    >
                      Message customer
                    </Button>
                  </div>
                </div>
              <div className="mt-4">
                <BookingProgressStrip booking={booking} />
              </div>
              <NextActionHint
                label={getVendorBookingNextStep(booking)}
                action={
                  booking.escrow?.status === 'ACTIVE' ? (
                    <Link href={`/dashboard/bookings/${booking.id}`}>
                      <Button size="sm" variant="ghost">Open delivery workspace</Button>
                    </Link>
                  ) : booking.escrow?.status === 'DISPUTED' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMessageBookingId(booking.id);
                        setFeedback(null);
                      }}
                    >
                      Send evidence note
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMessageBookingId(booking.id);
                        setFeedback(null);
                      }}
                    >
                      Message customer
                    </Button>
                  )
                }
              />
              {messageBookingId === booking.id ? (
                <form className="mt-4 grid gap-4 rounded-[20px] border border-[rgba(184,208,255,0.16)] bg-[rgba(255,255,255,0.04)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" onSubmit={handleMessageSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]" htmlFor={`vendor-message-${booking.id}`}>Message customer</label>
                    <textarea
                      id={`vendor-message-${booking.id}`}
                      rows={4}
                      placeholder="Share progress, clarify scope, or request delivery feedback."
                      {...messageForm.register('content')}
                    />
                    <FormHint text="Use this for delivery updates, scope clarifications, or one concrete request from the customer." />
                    {messageForm.formState.errors.content ? <p className="text-sm text-rose-300">{messageForm.formState.errors.content.message}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
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
                  </div>
                </form>
              ) : null}
            </div>
          ))}
          {!vendorBookings.isLoading && !vendorBookings.data?.length ? (
            <EmptyState
              icon={<MessagesSquare className="size-5" />}
              title="No active projects yet"
              description="Once a client books one of your services, this area will show the project state and the next delivery action."
            />
          ) : null}
        </div>
      </Card>

      <Card variant="activity" className="mt-6">
        <SectionHeader
          eyebrow="Delivery timeline"
          title="See project progress at a glance"
          description="Timelines keep the key status changes readable without opening each booking one by one."
          variant="activity"
        />
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {vendorBookings.data?.slice(0, 4).map((booking) => (
            <BookingTimeline key={`vendor-timeline-${booking.id}`} booking={booking} perspective="vendor" />
          ))}
          {!vendorBookings.isLoading && !vendorBookings.data?.length ? (
            <EmptyState
              icon={<BadgeCheck className="size-5" />}
              title="No delivery timeline yet"
              description="Booking milestones will appear here after the first active engagement starts moving."
            />
          ) : null}
        </div>
      </Card>

      <Card variant="risk" className="mt-6">
        <SectionHeader
          eyebrow="Trust telemetry"
          title="Monitor reputation signals"
          description="Keep an eye on release ratios, disputes, and volume without jumping into another tool."
          variant="risk"
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[20px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.56),rgba(108,36,74,0.4))] p-4 transition duration-300 hover:-translate-y-1">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Trust score</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">
              {vendorTrust.data ? vendorTrust.data.calculated_trust_score : '--'}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{vendorTrust.data ? `Risk ${vendorTrust.data.risk_level}` : 'Waiting for trust profile.'}</p>
          </div>
          <div className="rounded-[20px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.56),rgba(108,36,74,0.4))] p-4 transition duration-300 hover:-translate-y-1">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Release ratio</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">
              {vendorTrust.data ? `${Math.round(vendorTrust.data.escrow_release_ratio * 100)}%` : '--'}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Escrows released after confirmation.</p>
          </div>
          <div className="rounded-[20px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.56),rgba(108,36,74,0.4))] p-4 transition duration-300 hover:-translate-y-1">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Disputes</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">
              {vendorTrust.data ? vendorTrust.data.dispute_count : '--'}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Completed jobs: {vendorTrust.data?.completed_jobs_count ?? '--'}</p>
          </div>
          <div className="rounded-[20px] border border-[rgba(255,151,182,0.2)] bg-[linear-gradient(180deg,rgba(58,18,48,0.56),rgba(108,36,74,0.4))] p-4 transition duration-300 hover:-translate-y-1">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Volume</p>
            <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">
              {vendorTrust.data ? vendorTrust.data.total_volume_minor : '--'}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Minor units released through escrow.</p>
          </div>
        </div>
      </Card>

      <Card variant="market" className="mt-6">
        <SectionHeader
          eyebrow="Review signal"
          title="Recent client feedback"
          description="Quickly scan recent reviews and use them to refine your offers."
          variant="market"
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {vendorReviews.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : null}
          {vendorReviews.isError ? (
            <FeedbackBanner message={vendorReviews.error instanceof Error ? vendorReviews.error.message : 'Unable to load reviews'} tone="danger" />
          ) : null}
          {vendorReviews.data?.slice(0, 4).map((review, index) => (
            <div
              key={review.id}
              className="rounded-[20px] border border-[rgba(170,180,255,0.2)] bg-[linear-gradient(180deg,rgba(20,26,84,0.62),rgba(32,47,132,0.42))] p-4 transition duration-300 hover:-translate-y-1 animate-fade-up-delayed"
              style={{ ['--stagger-delay' as string]: `${index * 40}ms` }}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Booking #{review.booking_id}</p>
              <p className="mt-3 font-display text-2xl text-[var(--text-primary)]">{review.rating}/5</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{review.comment ?? 'No comment supplied.'}</p>
            </div>
          ))}
          {!vendorReviews.isLoading && !vendorReviews.data?.length ? (
            <EmptyState
              icon={<BadgeCheck className="size-5" />}
              title="No reviews yet"
              description="Client feedback will start appearing here once completed bookings accumulate."
            />
          ) : null}
        </div>
      </Card>
    </DashboardShell>
  );
}
