'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Layers3, SearchCheck, ShieldCheck, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getRequestServiceInsights } from '@/lib/services/request-service-insights';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

const SERVICE_DISCOVERY_STALE_MS = 60_000;

const requestSchema = z.object({
  request_summary: z.string().min(12, 'Tell WOLFIX what you need in at least 12 characters').max(220, 'Keep the summary within 220 characters'),
  scope_details: z.string().max(2000, 'Keep the details within 2000 characters').optional().or(z.literal('')),
  deadline_note: z.string().max(160, 'Keep the timing note within 160 characters').optional().or(z.literal('')),
  budget_note: z.string().max(160, 'Keep the budget note within 160 characters').optional().or(z.literal('')),
});

type RequestFormValues = z.infer<typeof requestSchema>;

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

export default function RequestServiceCreatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceTypeId = Number(params.id);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const isClient = !isAdmin && !isVendor;
  const groupSlug = searchParams.get('group')?.trim();
  const detailHref = groupSlug
    ? `/dashboard/request-services/${serviceTypeId}?group=${encodeURIComponent(groupSlug)}`
    : `/dashboard/request-services/${serviceTypeId}`;

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      request_summary: '',
      scope_details: '',
      deadline_note: '',
      budget_note: '',
    },
  });

  const watchedRequestSummary = useWatch({ control: form.control, name: 'request_summary' }) ?? '';

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isClient) {
      router.replace(isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard');
    }
  }, [isAdmin, isClient, isVendor, router, user]);

  const serviceType = useQuery({
    queryKey: ['request-service-type-create', token, serviceTypeId],
    queryFn: () => apiClient.getServiceType(serviceTypeId, token ?? ''),
    enabled: Boolean(token) && Number.isFinite(serviceTypeId),
    staleTime: SERVICE_DISCOVERY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const insights = serviceType.data ? getRequestServiceInsights(serviceType.data) : null;
  const laneLabel = serviceType.data?.group_title ?? insights?.laneLabel ?? 'Service lane';

  useEffect(() => {
    if (!serviceType.data || form.formState.isDirty) {
      return;
    }

    form.reset({
      request_summary: serviceType.data.default_brief_template
        ? serviceType.data.default_brief_template
        : `I need ${serviceType.data.name.toLowerCase()} for this project.`,
      scope_details: '',
      deadline_note: '',
      budget_note: '',
    });
  }, [form, serviceType.data]);

  const createRequest = useMutation({
    mutationFn: async (values: RequestFormValues) => {
      if (!token) {
        throw new Error('Sign in first to continue with your request');
      }

      return apiClient.createClientRequest(token, {
        service_type_id: serviceTypeId,
        request_summary: values.request_summary,
        scope_details: values.scope_details || null,
        deadline_note: values.deadline_note || null,
        budget_note: values.budget_note || null,
      });
    },
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['client-requests', token] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-bookings'] }),
      ]);
      router.push(`/dashboard/requests/${response.request.id}`);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to create request');
    },
  });

  const requestErrors = getFormErrorMessages(form.formState.errors as Record<string, unknown>);

  const handleSubmit = form.handleSubmit(async (values) => {
    setFeedback(null);
    await createRequest.mutateAsync(values);
  });

  return (
    <DashboardShell
      title="Request setup"
      subtitle="Write your need clearly on this page. After you submit, WOLFIX will manage the provider review and send you the next update."
      mobileQuickActions={
        <div className="grid grid-cols-2 gap-2">
          <Link href={detailHref}>
            <Button size="sm" variant="ghost" className="w-full">Back</Button>
          </Link>
          <Link href="/dashboard/requests">
            <Button size="sm" variant="ghost" className="w-full">Requests</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {feedback ? (
          <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
            {serviceType.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : null}

            {serviceType.data ? (
              <form className="grid gap-5" onSubmit={handleSubmit}>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(59,130,246,0.14)] bg-white/82 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                    <Layers3 className="size-3.5" />
                    {laneLabel}
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.22em] text-[var(--brand-primary)]">Request form</p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">{serviceType.data.name}</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    This request will stay platform-managed. WOLFIX will coordinate provider review and return with the clean next step.
                  </p>
                  {insights ? <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{insights.outcome}</p> : null}
                </div>

                {requestErrors.length ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {requestErrors.join(' ')}
                  </div>
                ) : null}

                <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">What do you need?</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Write one clear line about the outcome you want WOLFIX to coordinate.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="client-request-summary-input">Request summary</label>
                    <input
                      id="client-request-summary-input"
                      placeholder={insights?.summaryPlaceholder ?? 'Example: I need a business website with product pages and WhatsApp contact.'}
                      {...form.register('request_summary')}
                      className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                    />
                    <p className="text-sm text-[var(--text-secondary)]">Keep it outcome-focused so admin starts from the same understanding.</p>
                    {form.formState.errors.request_summary ? <p className="text-sm text-rose-600">{form.formState.errors.request_summary.message}</p> : null}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Add useful details</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Mention pages, features, deliverables, or documents that matter for the work.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="client-request-details-input">More details</label>
                    <textarea
                      id="client-request-details-input"
                      rows={5}
                      placeholder={insights?.detailsPlaceholder ?? 'Example: Home page, about page, services page, contact form, mobile responsiveness, and basic SEO setup.'}
                      {...form.register('scope_details')}
                      className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
                    />
                    <p className="text-sm text-[var(--text-secondary)]">A few useful details are enough. You do not need a long specification here.</p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Timing note</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Add timing only if it matters.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="client-request-deadline-input">Deadline note</label>
                      <input
                        id="client-request-deadline-input"
                        placeholder={insights?.timingHint ?? 'Example: First version needed within 7 days.'}
                        {...form.register('deadline_note')}
                        className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                      />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Budget note</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Budget is optional, but useful if it will shape the admin review.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="client-request-budget-input">Budget note</label>
                      <input
                        id="client-request-budget-input"
                        placeholder={insights?.budgetHint ?? 'Example: Keep this within a starter business budget.'}
                        {...form.register('budget_note')}
                        className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                      />
                    </div>
                  </div>
                </div>

                {form.formState.isDirty ? <InlineStateNote tone="info" message="You have unsaved request details on this page." /> : null}

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="w-full sm:w-auto" disabled={createRequest.isPending || watchedRequestSummary.trim().length < 12}>
                    {createRequest.isPending ? 'Sending request...' : 'Send request'}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                  <Link href={detailHref} className="w-full sm:w-auto">
                    <Button type="button" variant="ghost" className="w-full sm:w-auto">Back to service</Button>
                  </Link>
                </div>
              </form>
            ) : null}
          </Card>

          <div className="grid gap-6">
            <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(14,165,233,0.12)] text-[var(--accent-cyan)]">
                  <SearchCheck className="size-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-primary)]">Ready before submit</p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Use the details that help this lane start cleanly</h2>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {insights?.readiness.map((item) => (
                  <div key={item.title} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(59,130,246,0.10)] text-[var(--brand-primary)]">
                  <Workflow className="size-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-primary)]">Next step</p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">After you send this request</h2>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {insights?.process.map((step, index) => (
                  <div key={step.title} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Step {index + 1}</p>
                    <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{step.detail}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(16,185,129,0.12)] text-[var(--accent-teal)]">
                  <ShieldCheck className="size-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-primary)]">Platform promise</p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Payment does not open on this page yet</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                This page creates the request only. WOLFIX first reviews the lane, compares the right vendor path, and sends back one clean update before any payment step becomes active.
              </p>
              <div className="mt-5">
                <InlineStateNote tone="info" message="Submit the request here first. Payment only opens after the managed review update is ready." />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
