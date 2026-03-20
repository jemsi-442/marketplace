'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Building2, WalletMinimal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

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

type VendorProfileFormValues = z.infer<typeof vendorProfileSchema>;
type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;
type ServiceFormValues = z.infer<typeof serviceSchema>;

export default function VendorDashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [withdrawalFeedback, setWithdrawalFeedback] = useState<string | null>(null);
  const [serviceFeedback, setServiceFeedback] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const vendorProfile = useQuery({
    queryKey: ['vendor-profile-page', token],
    queryFn: () => apiClient.getVendorProfile(token ?? ''),
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
      await queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (error) => {
      setServiceFeedback(error instanceof Error ? error.message : 'Unable to disable service');
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
  const vendorServices = services.data?.filter((service) => service.vendor_user_id === user?.id) ?? [];

  return (
    <DashboardShell
      title="Vendor rail"
      subtitle="This cockpit is focused on payout readiness, trust posture, and the operational details vendors need without exposing accounting complexity."
    >
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard eyebrow="Profile status" value={vendorProfile.data?.exists ? 'Live' : 'Missing'} detail={vendorProfile.data?.exists ? vendorProfile.data.company_name ?? 'Vendor profile is linked.' : 'Create vendor profile details to unlock marketplace presence.'} icon={<Building2 className="size-8" />} />
        <StatCard eyebrow="Trust path" value="Composable" detail="Backend trust and fraud modules are ready for future scorecards and anomaly alerts here." icon={<BadgeCheck className="size-8" />} />
        <StatCard eyebrow="Wallet rail" value={withdrawalSummary.data ? String(withdrawalSummary.data.balance_minor) : 'Ready'} detail={withdrawalSummary.data ? `Available in ${withdrawalSummary.data.currency}` : 'Double-entry wallet and Snippe payout backend can now be surfaced through dedicated transaction views.'} icon={<WalletMinimal className="size-8" />} />
      </div>

      <Card className="mt-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Live vendor API panel</p>
        <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5 text-sm leading-7 text-[var(--text-secondary)]">
          {vendorProfile.isLoading ? 'Loading vendor profile from Symfony backend...' : null}
          {vendorProfile.isError ? `Vendor API returned: ${vendorProfile.error instanceof Error ? vendorProfile.error.message : 'Unknown error'}` : null}
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
      <Card>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Vendor onboarding</p>
            <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">
              {vendorProfile.data?.exists ? 'Update profile posture' : 'Create vendor profile'}
            </h2>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {vendorProfile.data?.exists ? 'existing profile' : 'new profile'}
          </div>
        </div>

        <form className="mt-6 grid gap-5 lg:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm text-[var(--text-secondary)]" htmlFor="companyName">Company name</label>
            <input id="companyName" placeholder="Nexus Digital Studio" {...form.register('companyName')} />
            {form.formState.errors.companyName ? <p className="text-sm text-rose-300">{form.formState.errors.companyName.message}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[var(--text-secondary)]" htmlFor="website">Website</label>
            <input id="website" placeholder="https://company.example" {...form.register('website')} />
            {form.formState.errors.website ? <p className="text-sm text-rose-300">{form.formState.errors.website.message}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[var(--text-secondary)]" htmlFor="portfolioLink">Portfolio link</label>
            <input id="portfolioLink" placeholder="https://portfolio.example" {...form.register('portfolioLink')} />
            {form.formState.errors.portfolioLink ? <p className="text-sm text-rose-300">{form.formState.errors.portfolioLink.message}</p> : null}
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm text-[var(--text-secondary)]" htmlFor="bio">Bio</label>
            <textarea id="bio" rows={6} placeholder="Describe your studio, delivery strengths, and expertise." {...form.register('bio')} />
            {form.formState.errors.bio ? <p className="text-sm text-rose-300">{form.formState.errors.bio.message}</p> : null}
          </div>

          {feedback ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-sm text-[var(--text-primary)] lg:col-span-2">
              {feedback}
            </div>
          ) : null}

          <div className="lg:col-span-2">
            <Button type="submit" disabled={upsertVendorProfile.isPending}>
              {upsertVendorProfile.isPending
                ? 'Saving profile...'
                : vendorProfile.data?.exists
                  ? 'Update vendor profile'
                  : 'Create vendor profile'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Wallet and payouts</p>
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
          <div className="space-y-2">
            <label className="text-sm text-[var(--text-secondary)]" htmlFor="amount_minor">Amount minor</label>
            <input id="amount_minor" type="number" min="1" {...withdrawalForm.register('amount_minor', { valueAsNumber: true })} />
            {withdrawalForm.formState.errors.amount_minor ? <p className="text-sm text-rose-300">{withdrawalForm.formState.errors.amount_minor.message}</p> : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="msisdn">MSISDN</label>
              <input id="msisdn" placeholder="2557XXXXXXXX" {...withdrawalForm.register('msisdn')} />
              {withdrawalForm.formState.errors.msisdn ? <p className="text-sm text-rose-300">{withdrawalForm.formState.errors.msisdn.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="provider">Provider</label>
              <select id="provider" {...withdrawalForm.register('provider')}>
                <option value="MPESA">M-Pesa</option>
                <option value="AIRTEL">Airtel Money</option>
                <option value="YAS">YAS</option>
              </select>
              {withdrawalForm.formState.errors.provider ? <p className="text-sm text-rose-300">{withdrawalForm.formState.errors.provider.message}</p> : null}
            </div>
          </div>

          {withdrawalFeedback ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-sm text-[var(--text-primary)]">
              {withdrawalFeedback}
            </div>
          ) : null}

          <Button type="submit" disabled={requestWithdrawal.isPending}>
            {requestWithdrawal.isPending ? 'Submitting withdrawal...' : 'Request withdrawal'}
          </Button>
        </form>

        <div className="mt-8 space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Withdrawal history</p>
          {withdrawals.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading withdrawals...</p> : null}
          {withdrawals.isError ? <p className="text-sm text-rose-300">{withdrawals.error instanceof Error ? withdrawals.error.message : 'Unable to load withdrawals'}</p> : null}
          {withdrawals.data?.map((withdrawal) => (
            <div key={withdrawal.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-sm text-[var(--text-secondary)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[var(--text-primary)]">{withdrawal.reference}</p>
                  <p className="mt-1">{withdrawal.amount_minor} {withdrawal.currency} · {withdrawal.provider}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{withdrawal.created_at}</p>
                </div>
                <div className="rounded-full border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em] text-[var(--brand-secondary)]">
                  {withdrawal.status}
                </div>
              </div>
              {withdrawal.failure_reason ? <p className="mt-3 text-rose-300">Reason: {withdrawal.failure_reason}</p> : null}
            </div>
          ))}
          {!withdrawals.isLoading && !withdrawals.data?.length ? (
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-sm text-[var(--text-secondary)]">
              No withdrawals yet.
            </div>
          ) : null}
        </div>
      </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Service inventory</p>
              <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">
                {editingServiceId ? 'Edit service offer' : 'Create service offer'}
              </h2>
            </div>
            <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {vendorServices.length} active services
            </div>
          </div>

          <form className="mt-6 grid gap-5" onSubmit={handleServiceSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="service-title">Title</label>
              <input id="service-title" placeholder="Mobile app design sprint" {...serviceForm.register('title')} />
              {serviceForm.formState.errors.title ? <p className="text-sm text-rose-300">{serviceForm.formState.errors.title.message}</p> : null}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]" htmlFor="service-category">Category</label>
                <input id="service-category" placeholder="Design" {...serviceForm.register('category')} />
                {serviceForm.formState.errors.category ? <p className="text-sm text-rose-300">{serviceForm.formState.errors.category.message}</p> : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]" htmlFor="service-price">Price cents</label>
                <input id="service-price" type="number" min="1" {...serviceForm.register('price_cents', { valueAsNumber: true })} />
                {serviceForm.formState.errors.price_cents ? <p className="text-sm text-rose-300">{serviceForm.formState.errors.price_cents.message}</p> : null}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-secondary)]" htmlFor="service-description">Description</label>
              <textarea id="service-description" rows={5} placeholder="Describe the delivery scope, process, and outcomes." {...serviceForm.register('description')} />
              {serviceForm.formState.errors.description ? <p className="text-sm text-rose-300">{serviceForm.formState.errors.description.message}</p> : null}
            </div>

            {serviceFeedback ? (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-sm text-[var(--text-primary)]">
                {serviceFeedback}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={upsertService.isPending}>
                {upsertService.isPending ? 'Saving service...' : editingServiceId ? 'Update service' : 'Create service'}
              </Button>
              {editingServiceId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingServiceId(null);
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
            </div>
          </form>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Your service listings</p>
          <div className="mt-5 space-y-4">
            {services.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading services...</p> : null}
            {services.isError ? <p className="text-sm text-rose-300">{services.error instanceof Error ? services.error.message : 'Unable to load services'}</p> : null}
            {vendorServices.map((service) => (
              <div key={service.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-display text-xl text-[var(--text-primary)]">{service.title}</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{service.description ?? 'No description yet.'}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      {service.category ?? 'General'} · {service.price_cents} minor units
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingServiceId(service.id);
                        setServiceFeedback(null);
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
                        deleteService.mutate(service.id);
                      }}
                      disabled={deleteService.isPending}
                    >
                      Disable
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!services.isLoading && !vendorServices.length ? (
              <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-sm text-[var(--text-secondary)]">
                No active services yet. Create the first offer to appear in the marketplace.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Review signal</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {vendorReviews.isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading reviews...</p> : null}
          {vendorReviews.isError ? <p className="text-sm text-rose-300">{vendorReviews.error instanceof Error ? vendorReviews.error.message : 'Unable to load reviews'}</p> : null}
          {vendorReviews.data?.slice(0, 4).map((review) => (
            <div key={review.id} className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Booking #{review.booking_id}</p>
              <p className="mt-3 font-display text-2xl text-[var(--text-primary)]">{review.rating}/5</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{review.comment ?? 'No comment supplied.'}</p>
            </div>
          ))}
          {!vendorReviews.isLoading && !vendorReviews.data?.length ? (
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-sm text-[var(--text-secondary)]">
              No reviews yet. Completed bookings will start populating this area.
            </div>
          ) : null}
        </div>
      </Card>
    </DashboardShell>
  );
}
