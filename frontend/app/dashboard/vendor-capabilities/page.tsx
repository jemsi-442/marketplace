'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Boxes,
  BrushCleaning,
  Landmark,
  Layers3,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  Sparkles,
  Workflow,
} from 'lucide-react';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { resolveServiceGroupSlugFromValue } from '@/lib/services/catalog-groups';
import { resolveCapabilityGroupSlug } from '@/lib/services/vendor-capability-flow';
import type { ServiceGroupRecord } from '@/lib/types';

const iconMap: Record<string, typeof Boxes> = {
  'software-development': Boxes,
  'design-creative': BrushCleaning,
  'social-media-marketing': Workflow,
  'cybersecurity-infrastructure': ShieldEllipsis,
  'government-consultancy': Landmark,
  'automation-operations': ShieldCheck,
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export default function VendorCapabilitiesPage() {
  return (
    <Suspense fallback={<VendorCapabilitiesPageFallback />}>
      <VendorCapabilitiesPageContent />
    </Suspense>
  );
}

function VendorCapabilitiesPageFallback() {
  return (
    <DashboardShell
      title="Capability lanes"
      subtitle="Start with one business lane first, then configure the exact capabilities inside that vendor lane."
    >
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[30px]" />
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-[28px]" />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

function VendorCapabilitiesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const [search, setSearch] = useState(searchParams.get('search')?.trim() ?? '');

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isVendor) {
      router.replace(isAdmin ? '/dashboard/admin' : '/dashboard/client');
    }
  }, [isAdmin, isVendor, router, user]);

  const serviceGroupsQuery = useQuery({
    queryKey: ['vendor-capability-groups', token],
    queryFn: () => apiClient.getServiceGroups(token ?? ''),
    enabled: Boolean(token) && isVendor,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const serviceTypesQuery = useQuery({
    queryKey: ['vendor-capability-service-types', token],
    queryFn: () => apiClient.getServiceTypes(token ?? ''),
    enabled: Boolean(token) && isVendor,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const capabilitiesQuery = useQuery({
    queryKey: ['vendor-service-capabilities', token],
    queryFn: () => apiClient.getVendorServiceCapabilities(token ?? ''),
    enabled: Boolean(token) && isVendor,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const categoryParam = searchParams.get('category')?.trim() ?? '';
  useEffect(() => {
    if (!categoryParam || !serviceGroupsQuery.data) {
      return;
    }

    const slug = resolveServiceGroupSlugFromValue(serviceGroupsQuery.data, categoryParam);
    if (!slug) {
      return;
    }

    const params = new URLSearchParams();
    params.set('search', categoryParam);
    router.replace(`/dashboard/vendor-capabilities/category/${slug}?${params.toString()}`);
  }, [categoryParam, router, serviceGroupsQuery.data]);

  const metricsByGroup = useMemo(() => {
    const map = new Map<string, { active: number; approved: number; pending: number; returned: number; configured: number }>();
    for (const group of serviceGroupsQuery.data ?? []) {
      map.set(group.slug, { active: 0, approved: 0, pending: 0, returned: 0, configured: 0 });
    }

    for (const capability of capabilitiesQuery.data ?? []) {
      const slug = resolveCapabilityGroupSlug(capability, serviceTypesQuery.data ?? [], serviceGroupsQuery.data ?? []);
      if (!slug) {
        continue;
      }

      const bucket = map.get(slug) ?? { active: 0, approved: 0, pending: 0, returned: 0, configured: 0 };
      bucket.configured += 1;
      if (capability.is_active) {
        bucket.active += 1;
      }
      if (capability.approved_by_admin) {
        bucket.approved += 1;
      } else if (capability.review_state === 'returned') {
        bucket.returned += 1;
      } else {
        bucket.pending += 1;
      }
      map.set(slug, bucket);
    }

    return map;
  }, [capabilitiesQuery.data, serviceGroupsQuery.data, serviceTypesQuery.data]);

  const groups = useMemo(() => {
    const summaries = serviceGroupsQuery.data ?? [];
    const term = normalize(search);
    if (!term) {
      return summaries;
    }

    return summaries.filter((group) => {
      const haystack = `${group.title} ${group.description} ${group.hero_title} ${group.hero_description} ${group.featured_services.join(' ')}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [search, serviceGroupsQuery.data]);

  const totalActiveCapabilities = useMemo(
    () => Array.from(metricsByGroup.values()).reduce((sum, bucket) => sum + bucket.active, 0),
    [metricsByGroup]
  );
  const reviewPressure = useMemo(
    () => Array.from(metricsByGroup.values()).reduce((sum, bucket) => sum + bucket.pending + bucket.returned, 0),
    [metricsByGroup]
  );
  const densestGroup = useMemo(() => {
    const summaries = serviceGroupsQuery.data ?? [];
    return summaries.reduce<ServiceGroupRecord | null>((best, current) => {
      if (!best || current.service_count > best.service_count) {
        return current;
      }

      return best;
    }, null);
  }, [serviceGroupsQuery.data]);

  return (
    <DashboardShell
      title="Capability lanes"
      subtitle="Start with one business lane first, then configure the exact capabilities your team can deliver well inside that vendor lane."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/vendor">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Workspace
              <ArrowRight className="size-4 rotate-180" />
            </Button>
          </Link>
          <Link href="/dashboard/vendor-requests">
            <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
              Open matched requests
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f7fbf9_55%,#edfdf5_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(16,185,129,0.18)] bg-white/82 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-teal)]">
                <Boxes className="size-3.5" />
                Vendor capability lanes
              </div>
              <h2 className="mt-4 font-display text-3xl tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
                Organize vendor capabilities by business lane before they enter the request queue.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                This keeps software, design, government consultancy, social media, cybersecurity, and operations work in separate lanes so your vendor studio stays clear and your review path stays focused.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Business lanes', value: String(serviceGroupsQuery.data?.length ?? 0) },
                  { label: 'Active lanes', value: String(totalActiveCapabilities) },
                  { label: 'Deepest lane', value: densestGroup?.title ?? 'Loading...' },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white/82 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.label}</p>
                    <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Search lanes</p>
              <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-3">
                <Search className="size-4 text-[var(--text-secondary)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search software, graphics, cybersecurity..."
                  className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Once you open a lane, that page gets its own focused search and capability editor.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge label={`${reviewPressure} need review`} tone={reviewPressure > 0 ? 'warning' : 'neutral'} />
                <StatusBadge label={`${totalActiveCapabilities} live now`} tone="success" />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          {[
            {
              title: 'Start with the business lane',
              detail: 'Choose the lane your team can deliver well first. That keeps the rest of the setup focused and believable.',
              icon: <Layers3 className="size-4" />,
            },
            {
              title: 'Write one strong capability brief',
              detail: 'Inside each lane, set price, scope, turnaround, and portfolio notes that help admin review the lane quickly.',
              icon: <Sparkles className="size-4" />,
            },
            {
              title: 'Wait for one managed review path',
              detail: 'Saved capability lanes go through review before they start feeding the matched request queue.',
              icon: <ShieldCheck className="size-4" />,
            },
          ].map((item) => (
            <Card key={item.title} className="flex h-full flex-col rounded-[26px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(16,185,129,0.10)] text-[var(--accent-teal)]">
                  {item.icon}
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-teal)]">{item.title}</p>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{item.detail}</p>
            </Card>
          ))}
        </div>

        {serviceGroupsQuery.isLoading || serviceTypesQuery.isLoading || capabilitiesQuery.isLoading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-56 rounded-[28px]" />
            ))}
          </div>
        ) : serviceGroupsQuery.isError || serviceTypesQuery.isError || capabilitiesQuery.isError ? (
          <EmptyState
            icon={<Boxes className="size-5" />}
            title="Capability lanes are not loading right now"
            description="Refresh and try again in a moment."
          />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="No capability lane matches this view"
            description="Try a broader search to reopen the full vendor capability map."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {groups.map((group) => {
              const Icon = iconMap[group.slug] ?? Boxes;
              const metrics = metricsByGroup.get(group.slug) ?? {
                active: 0,
                approved: 0,
                pending: 0,
                returned: 0,
                configured: 0,
              };

              return (
                <Card key={group.slug} className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent-teal)]">{group.eyebrow}</p>
                      <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{group.title}</h3>
                    </div>
                    <span className="flex size-12 items-center justify-center rounded-[20px] bg-[rgba(16,185,129,0.10)] text-[var(--accent-teal)]">
                      <Icon className="size-5" />
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{group.description}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <StatusBadge label={`${group.service_count} services`} tone="info" />
                    <StatusBadge label={`${metrics.active} active`} tone={metrics.active > 0 ? 'success' : 'neutral'} />
                    <StatusBadge label={`${metrics.approved} approved`} tone={metrics.approved > 0 ? 'success' : 'neutral'} />
                    <StatusBadge label={`${metrics.pending + metrics.returned} review items`} tone={metrics.pending + metrics.returned > 0 ? 'warning' : 'neutral'} />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Configured', value: String(metrics.configured) },
                      { label: 'Pending', value: String(metrics.pending) },
                      { label: 'Returned', value: String(metrics.returned) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,252,0.8)] px-4 py-4">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.label}</p>
                        <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,252,0.88)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Lane examples</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.featured_services.slice(0, 4).map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                    <Link href={`/dashboard/vendor-capabilities/category/${group.slug}`}>
                      <Button className="justify-between rounded-2xl bg-[var(--accent-teal)] px-5 text-white hover:bg-[var(--accent-teal-strong)]">
                        Configure lane
                        <ArrowRight className="ml-2 size-4" />
                      </Button>
                    </Link>
                    <Link href="/dashboard/vendor-requests">
                      <Button variant="ghost" className="rounded-2xl border border-[var(--line)] px-5">
                        Open request queue
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <InlineStateNote
          tone="info"
          message="Only saved capability lanes feed the vendor request queue. Each lane keeps its own review state, price, proof, and turnaround context."
        />
      </div>
    </DashboardShell>
  );
}
