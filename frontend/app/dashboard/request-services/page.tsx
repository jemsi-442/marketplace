'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Boxes, BrushCleaning, Landmark, Layers3, Search, ShieldCheck, ShieldEllipsis, Sparkles, Workflow } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type { ServiceGroupRecord } from '@/lib/types';
import { resolveServiceGroupSlugFromValue } from '@/lib/services/catalog-groups';

const SERVICE_DISCOVERY_STALE_MS = 60_000;

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

export default function RequestServicesPage() {
  return (
    <Suspense fallback={<RequestServicesPageFallback />}>
      <RequestServicesPageContent />
    </Suspense>
  );
}

function RequestServicesPageFallback() {
  return (
    <DashboardShell
      title="Business lanes"
      subtitle="Start with one business lane first, then open the exact service inside that lane."
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

function RequestServicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const isClient = !isAdmin && !isVendor;
  const [search, setSearch] = useState(searchParams.get('search')?.trim() ?? '');

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isClient) {
      router.replace(isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard');
    }
  }, [isAdmin, isClient, isVendor, router, user]);

  const serviceGroupsQuery = useQuery({
    queryKey: ['client-service-groups', token],
    queryFn: () => apiClient.getServiceGroups(token ?? ''),
    enabled: Boolean(token),
    staleTime: SERVICE_DISCOVERY_STALE_MS,
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
    router.replace(`/dashboard/request-services/category/${slug}?${params.toString()}`);
  }, [categoryParam, router, serviceGroupsQuery.data]);

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

  const totalServices = useMemo(
    () => (serviceGroupsQuery.data ?? []).reduce((sum, group) => sum + group.service_count, 0),
    [serviceGroupsQuery.data]
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
      title="Business lanes"
      subtitle="Start with one business lane first, then open the exact service inside that group."
      mobileQuickActions={
        <div className="grid gap-3">
          <Link href="/dashboard/client">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Back to workspace
              <ArrowRight className="size-4 rotate-180" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eefcff_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.18)] bg-white/82 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
                <Boxes className="size-3.5" />
                Services by business lane
              </div>
              <h2 className="mt-4 font-display text-3xl tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
                Choose the right group first, then search only inside that lane.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                This structure keeps software, graphics, government consultancy, social media, cybersecurity, and operations work in separate lanes so discovery feels clear instead of crowded.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Business lanes', value: String(serviceGroupsQuery.data?.length ?? 0) },
                  { label: 'Visible services', value: String(totalServices) },
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
                Once you open a lane, that page gets its own focused lane search.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          {[
            {
              title: 'Start with the business lane',
              detail: 'Choose the group that matches the type of outcome you want first. That keeps the rest of the search focused.',
              icon: <Layers3 className="size-4" />,
            },
            {
              title: 'Open the exact service next',
              detail: 'Inside the lane, you can narrow by subcategory and open the lane brief that best matches the real request.',
              icon: <Sparkles className="size-4" />,
            },
            {
              title: 'Move through one managed path',
              detail: 'Every request still goes through one WOLFIX review path before pricing or payment becomes the next step.',
              icon: <ShieldCheck className="size-4" />,
            },
          ].map((item) => (
            <Card key={item.title} className="flex h-full flex-col rounded-[26px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(59,130,246,0.10)] text-[var(--brand-primary)]">
                  {item.icon}
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">{item.title}</p>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{item.detail}</p>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">Business lanes</p>
            <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Open the lane that best matches the kind of work you need</h3>
          </div>

          {serviceGroupsQuery.isLoading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-56 rounded-[28px]" />
              ))}
            </div>
          ) : serviceGroupsQuery.isError ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="Business lanes are not loading right now"
              description="We could not load the WOLFIX lane structure. Refresh and try again in a moment."
            />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="No business lane matches this search"
              description="Try a broader term or clear the current search to reopen the full lane structure."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {groups.map((group: ServiceGroupRecord) => {
                const Icon = iconMap[group.slug] ?? Boxes;

                return (
                  <Card key={group.slug} className="flex h-full flex-col rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(59,130,246,0.10)] text-[var(--brand-primary)]">
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)]">{group.eyebrow}</p>
                          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{group.title}</h3>
                        </div>
                      </div>
                      <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        {group.service_count} services
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{group.description}</p>

                    <div className="mt-4 rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">This lane becomes useful when</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{group.hero_description}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.featured_services.slice(0, 4).map((name: string) => (
                        <span
                          key={name}
                          className="rounded-full border border-[var(--line)] bg-[rgba(248,250,252,0.92)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]"
                        >
                          {name}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      <Workflow className="size-3.5" />
                      Focused search and one managed commercial path
                    </div>

                  <div className="mt-auto pt-5">
                      <Link href={`/dashboard/request-services/category/${group.slug}`}>
                        <Button className="rounded-full">
                          Open category
                          <ArrowRight className="ml-2 size-4" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <InlineStateNote
          tone="info"
          message="Each lane page now becomes the focused place for its own services and search, instead of one long mixed directory."
        />
      </div>
    </DashboardShell>
  );
}
