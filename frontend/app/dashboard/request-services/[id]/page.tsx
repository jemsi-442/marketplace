'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ClipboardList, Layers3, SearchCheck, ShieldCheck, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getRequestServiceInsights } from '@/lib/services/request-service-insights';

const SERVICE_DISCOVERY_STALE_MS = 60_000;

export default function RequestServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const serviceTypeId = Number(params.id);
  const token = useAuthStore((state) => state.token);
  const groupSlug = searchParams.get('group')?.trim();
  const backHref = groupSlug ? `/dashboard/request-services/category/${groupSlug}` : '/dashboard/request-services';
  const continueHref = groupSlug
    ? `/dashboard/request-services/${serviceTypeId}/request?group=${encodeURIComponent(groupSlug)}`
    : `/dashboard/request-services/${serviceTypeId}/request`;

  const serviceType = useQuery({
    queryKey: ['request-service-type-detail', token, serviceTypeId],
    queryFn: () => apiClient.getServiceType(serviceTypeId, token ?? ''),
    enabled: Boolean(token) && Number.isFinite(serviceTypeId),
    staleTime: SERVICE_DISCOVERY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const insights = serviceType.data ? getRequestServiceInsights(serviceType.data) : null;
  const laneLabel = serviceType.data?.group_title ?? insights?.laneLabel ?? 'Service lane';

  return (
    <DashboardShell
      title="Lane brief"
      subtitle="Read the lane brief first, then continue to the request page when it matches what you need."
      mobileQuickActions={
        <div className="grid grid-cols-2 gap-2">
          <Link href={backHref}>
            <Button size="sm" variant="ghost" className="w-full">Back</Button>
          </Link>
          <Link href={continueHref}>
            <Button size="sm" className="w-full">Continue</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {serviceType.isLoading ? (
          <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Card>
        ) : serviceType.isError ? (
          <EmptyState icon={<ClipboardList className="size-5" />} title="This lane brief is not loading right now" description="Refresh the page and try again in a moment." />
        ) : serviceType.data ? (
          <>
            <Card className="overflow-hidden rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#eef6ff_100%)] p-5 shadow-[0_20px_54px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(59,130,246,0.14)] bg-white/82 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                    <Layers3 className="size-3.5" />
                    {laneLabel}
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">{serviceType.data.category ?? 'Digital service'}</p>
                  <h1 className="mt-2 font-display text-3xl tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">{serviceType.data.name}</h1>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                    {serviceType.data.description || 'Use this service when you want WOLFIX to coordinate the work, review the right provider behind the platform, and return with one clear admin update before payment opens.'}
                  </p>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                    {insights?.outcome}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={backHref} className="w-full sm:w-auto">
                      <Button variant="ghost" className="w-full sm:w-auto"><ArrowLeft className="mr-2 size-4" />Back to lanes</Button>
                    </Link>
                    <Link href={continueHref} className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto">Continue to request<ArrowRight className="ml-2 size-4" /></Button>
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Lane fit</p>
                    <div className="mt-4 space-y-4">
                      {[
                        { label: 'Admin-managed review', value: 'Active' },
                        { label: 'Lane', value: laneLabel },
                        { label: 'Category', value: serviceType.data.category ?? 'General' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-start justify-between gap-4">
                          <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                          <span className="text-right text-sm font-semibold text-[var(--text-primary)]">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Next move</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                      Open the request page once the service matches your real outcome. The next step stays inside one managed WOLFIX workflow.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(59,130,246,0.10)] text-[var(--brand-primary)]">
                    <Workflow className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">How this lane works</p>
                    <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Managed path from request to the next commercial step</h2>
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

              <div className="grid gap-6">
                <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(14,165,233,0.12)] text-[var(--accent-cyan)]">
                      <SearchCheck className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Before you continue</p>
                      <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Bring the details that help the review start cleanly</h2>
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    {insights?.readiness.map((item) => (
                      <div key={item.title} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">{item.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{item.detail}</p>
                      </div>
                    ))}
                    {serviceType.data.default_brief_template ? (
                      <div className="rounded-[22px] border border-[rgba(59,130,246,0.14)] bg-[rgba(59,130,246,0.06)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Request prompt</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{serviceType.data.default_brief_template}</p>
                      </div>
                    ) : null}
                  </div>
                </Card>

                <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(16,185,129,0.12)] text-[var(--accent-teal)]">
                      <ShieldCheck className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Platform promise</p>
                      <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">One managed update before money moves</h2>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                    This service stays inside the WOLFIX managed assignment flow. Vendors do not pitch directly to you in the open. The platform reviews, compares, and returns one clear next step first.
                  </p>
                  <div className="mt-6">
                    <Link href={continueHref}>
                      <Button>Open request page</Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>

            <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Commercial rhythm</p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">What the request becomes after you submit</h2>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">This stays consistent across WOLFIX business lanes</p>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: 'Request enters review',
                    detail: 'Your brief becomes a structured admin-managed request rather than an open marketplace post.',
                  },
                  {
                    title: 'Qualified vendor proposals',
                    detail: 'Relevant vendors respond behind the platform with pricing and timing for the real scope.',
                  },
                  {
                    title: 'Client-ready next step',
                    detail: 'You receive one clean update before payment, booking, or delivery workflow opens.',
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
