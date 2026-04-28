'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, Layers3, Search, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getServiceGroupBySlug } from '@/lib/services/catalog-groups';
import { getServiceCardCue, getServiceGroupSignals } from '@/lib/services/request-service-insights';

const SERVICE_DISCOVERY_STALE_MS = 60_000;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export default function RequestServiceCategoryPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const isClient = !isAdmin && !isVendor;
  const [search, setSearch] = useState(searchParams.get('search')?.trim() ?? '');
  const [activeCategory, setActiveCategory] = useState('All');
  const serviceGroupsQuery = useQuery({
    queryKey: ['client-service-groups', token],
    queryFn: () => apiClient.getServiceGroups(token ?? ''),
    enabled: Boolean(token),
    staleTime: SERVICE_DISCOVERY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const group = getServiceGroupBySlug(serviceGroupsQuery.data ?? [], params.slug);
  const groupSignals = group ? getServiceGroupSignals(group.slug, group.title) : null;

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isClient) {
      router.replace(isAdmin ? '/dashboard/admin' : isVendor ? '/dashboard/vendor' : '/dashboard');
    }
  }, [isAdmin, isClient, isVendor, router, user]);

  const serviceTypesQuery = useQuery({
    queryKey: ['client-request-service-types', token, params.slug, activeCategory, search],
    queryFn: () =>
      apiClient.getServiceTypes(token ?? '', {
        group: params.slug,
        category: activeCategory === 'All' ? undefined : activeCategory,
        search: search.trim() || undefined,
      }),
    enabled: Boolean(token) && Boolean(group),
    staleTime: SERVICE_DISCOVERY_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const groupedServiceTypes = serviceTypesQuery.data ?? [];

  const subcategories = useMemo(() => {
    const labels = new Set<string>();
    for (const item of groupedServiceTypes) {
      if (item.category) {
        labels.add(item.category);
      }
    }

    return ['All', ...Array.from(labels).sort((left, right) => left.localeCompare(right))];
  }, [groupedServiceTypes]);

  const filteredServiceTypes = useMemo(() => {
    const term = normalize(search);
    return groupedServiceTypes.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const haystack = `${item.name} ${item.description ?? ''} ${item.category ?? ''}`.toLowerCase();
      return matchesCategory && (!term || haystack.includes(term));
    });
  }, [activeCategory, groupedServiceTypes, search]);

  if (serviceGroupsQuery.isLoading) {
    return (
      <DashboardShell title="Service lane" subtitle="Loading this business lane now.">
      
        <Skeleton className="h-56 rounded-[30px]" />
      </DashboardShell>
    );
  }

  if (!group) {
    return (
      <DashboardShell
        title="Service lane"
        subtitle="This business lane is not available."
      >
        <EmptyState
          icon={<Search className="size-5" />}
          title="This category does not exist"
          description="Go back and choose one of the visible lanes."
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={group.title}
      subtitle={group.hero_description}
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/request-services">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              All categories
              <ArrowRight className="size-4 rotate-180" />
            </Button>
          </Link>
          <Link href="/dashboard/client">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Workspace
              <ArrowRight className="size-4 rotate-180" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_36%),linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#eef5ff_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">{group.eyebrow}</p>
              <h2 className="mt-3 font-display text-3xl tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">{group.hero_title}</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">{group.hero_description}</p>
            </div>

            <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Search this lane</p>
              <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-3">
                <Search className="size-4 text-[var(--text-secondary)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={group.search_placeholder}
                  className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Search stays inside this lane only.
              </p>
            </div>
          </div>
        </Card>

        {groupSignals ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {[
              {
                title: 'Best for',
                detail: groupSignals.bestFor,
                icon: <Sparkles className="size-4" />,
              },
              {
                title: 'Best angle',
                detail: groupSignals.requestAngle,
                icon: <Layers3 className="size-4" />,
              },
              {
                title: 'Next path',
                detail: groupSignals.commercialPath,
                icon: <Workflow className="size-4" />,
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
        ) : null}

        <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {subcategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    activeCategory === category
                      ? 'border-[var(--brand-primary)] bg-[rgba(59,130,246,0.12)] text-[var(--brand-primary)]'
                      : 'border-[var(--line)] bg-white text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.08)]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <InlineStateNote
              tone="info"
              message={
                activeCategory === 'All'
                  ? `Showing all services inside ${group.title}.`
                  : `Showing ${activeCategory} inside ${group.title}.`
              }
            />
          </div>
        </Card>

        <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-primary)]">Open one service</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Choose the exact service</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{filteredServiceTypes.length} visible services</p>
          </div>

          {serviceTypesQuery.isLoading ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-48 rounded-[24px]" />
              ))}
            </div>
          ) : serviceTypesQuery.isError ? (
            <div className="mt-6">
              <EmptyState
                icon={<Search className="size-5" />}
                title="This service lane is not loading right now"
                description="Refresh the page and try again in a moment."
              />
            </div>
          ) : filteredServiceTypes.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={<Search className="size-5" />}
                title="No service matches this view"
                description="Try a broader search or switch subcategory."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {filteredServiceTypes.map((serviceType) => (
                <Card key={serviceType.id} className="flex h-full flex-col rounded-[26px] border border-[rgba(15,23,42,0.08)] p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--brand-primary)]">{serviceType.category ?? group.title}</p>
                      <h3 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{serviceType.name}</h3>
                    </div>
                    <span className="rounded-full border border-[rgba(59,130,246,0.14)] bg-[rgba(59,130,246,0.08)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                      Managed lane
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {serviceType.description || 'Open this service to see how WOLFIX will coordinate the request and next step.'}
                  </p>
                  <div className="mt-4 rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Why open this</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      {getServiceCardCue(serviceType)}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--line)] bg-[rgba(248,250,252,0.92)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      Managed assignment
                    </span>
                    <span className="rounded-full border border-[var(--line)] bg-[rgba(248,250,252,0.92)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      Search active
                    </span>
                    <span className="rounded-full border border-[var(--line)] bg-[rgba(248,250,252,0.92)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="size-3.5" />
                        Next step before payment
                      </span>
                    </span>
                  </div>
                  <div className="mt-auto pt-5">
                    <Link href={`/dashboard/request-services/${serviceType.id}?group=${group.slug}`} className="w-full sm:w-auto">
                      <Button className="w-full rounded-full sm:w-auto">
                        Open lane brief
                        <ArrowRight className="ml-2 size-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
