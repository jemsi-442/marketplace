'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Layers3, Search, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { getServiceGroupBySlug } from '@/lib/services/catalog-groups';
import {
  buildDraftCapability,
  capabilityInputFromDraft,
  capabilityInputFromRecord,
  makeDefaultCapability,
  type DraftCapability,
} from '@/lib/services/vendor-capability-flow';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function formatMoney(amount?: number | null, currency = 'TZS'): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '--';
  }

  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-TZ');
}

export default function VendorCapabilityCategoryPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const [search, setSearch] = useState(searchParams.get('search')?.trim() ?? '');
  const [activeCategory, setActiveCategory] = useState('All');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draftOverrides, setDraftOverrides] = useState<Record<number, Partial<DraftCapability>>>({});

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
  const group = getServiceGroupBySlug(serviceGroupsQuery.data ?? [], params.slug);

  const serviceTypesQuery = useQuery({
    queryKey: ['vendor-capability-service-types', token, params.slug, search],
    queryFn: () =>
      apiClient.getServiceTypes(token ?? '', {
        group: params.slug,
        search: search.trim() || undefined,
      }),
    enabled: Boolean(token) && isVendor && Boolean(group),
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

  const capabilityByServiceTypeId = useMemo(() => {
    return new Map((capabilitiesQuery.data ?? []).map((capability) => [capability.service_type.id, capability]));
  }, [capabilitiesQuery.data]);

  const drafts = useMemo(() => {
    const nextDrafts: Record<number, DraftCapability> = {};

    for (const serviceType of serviceTypesQuery.data ?? []) {
      const baseDraft = buildDraftCapability(capabilityByServiceTypeId.get(serviceType.id));
      nextDrafts[serviceType.id] = {
        ...baseDraft,
        ...(draftOverrides[serviceType.id] ?? {}),
      };
    }

    return nextDrafts;
  }, [capabilityByServiceTypeId, draftOverrides, serviceTypesQuery.data]);

  const subcategories = useMemo(() => {
    const labels = new Set<string>();
    for (const item of serviceTypesQuery.data ?? []) {
      if (item.category) {
        labels.add(item.category);
      }
    }

    return ['All', ...Array.from(labels).sort((left, right) => left.localeCompare(right))];
  }, [serviceTypesQuery.data]);

  const filteredServiceTypes = useMemo(() => {
    const term = normalize(search);
    return (serviceTypesQuery.data ?? []).filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const haystack = `${item.name} ${item.description ?? ''} ${item.category ?? ''}`.toLowerCase();
      return matchesCategory && (!term || haystack.includes(term));
    });
  }, [activeCategory, search, serviceTypesQuery.data]);

  const selectedCount = useMemo(
    () => Object.values(drafts).filter((draft) => draft.enabled).length,
    [drafts]
  );
  const approvedCount = useMemo(
    () => Object.values(drafts).filter((draft) => draft.review_state === 'approved').length,
    [drafts]
  );
  const needsReviewCount = useMemo(
    () => Object.values(drafts).filter((draft) => draft.enabled && draft.review_state !== 'approved').length,
    [drafts]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const currentGroupIds = new Set((serviceTypesQuery.data ?? []).map((item) => item.id));
      const preservedCapabilities = (capabilitiesQuery.data ?? [])
        .filter((capability) => !currentGroupIds.has(capability.service_type.id))
        .map((capability) => capabilityInputFromRecord(capability));

      const currentGroupCapabilities = (serviceTypesQuery.data ?? [])
        .filter((serviceType) => {
          const draft = drafts[serviceType.id] ?? makeDefaultCapability();
          return draft.enabled || capabilityByServiceTypeId.has(serviceType.id);
        })
        .map((serviceType) => capabilityInputFromDraft(serviceType.id, drafts[serviceType.id] ?? makeDefaultCapability()));

      const payload = [...preservedCapabilities, ...currentGroupCapabilities].sort(
        (left, right) => left.service_type_id - right.service_type_id,
      );

      return apiClient.updateVendorServiceCapabilities(token, payload);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setDraftOverrides({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vendor-service-capabilities', token] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-request-feed', token] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-dashboard-summary', token] }),
      ]);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to save this capability lane right now.');
    },
  });

  const updateDraft = (serviceTypeId: number, patch: Partial<DraftCapability>) => {
    setDraftOverrides((current) => ({
      ...current,
      [serviceTypeId]: {
        ...(current[serviceTypeId] ?? {}),
        ...patch,
      },
    }));
  };

  if (serviceGroupsQuery.isLoading) {
    return (
      <DashboardShell title="Capability lane" subtitle="Loading this vendor lane now.">
        <Skeleton className="h-56 rounded-[30px]" />
      </DashboardShell>
    );
  }

  if (!group) {
    return (
      <DashboardShell title="Capability lane" subtitle="This vendor lane is not available.">
        <EmptyState
          icon={<Search className="size-5" />}
          title="This capability lane does not exist"
          description="Go back to capability lanes and choose one of the visible business lanes."
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={group.title}
      subtitle="Configure the exact capabilities your team can deliver inside this business lane. Save this lane when price, scope, and proof are ready for review."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/vendor-capabilities">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              All capability lanes
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
        {feedback ? <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} /> : null}

        <Card className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#eefaf3_100%)] p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent-teal)]">{group.eyebrow}</p>
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
                  placeholder={`Search inside ${group.title}`}
                  className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Search stays inside this vendor lane only, so your capability editor stays focused.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          {[
            {
              title: 'What to activate',
              detail: 'Turn on only the services your team can deliver clearly, repeatedly, and with believable scope proof.',
              icon: <Sparkles className="size-4" />,
            },
            {
              title: 'What admin reviews',
              detail: 'Price, portfolio note, turnaround, and lane clarity should make sense together before approval.',
              icon: <ShieldCheck className="size-4" />,
            },
            {
              title: 'What this lane unlocks',
              detail: 'A clean approved lane feeds the matched request queue and gives you stronger fit inside vendor operations.',
              icon: <Workflow className="size-4" />,
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
                      ? 'border-[var(--accent-teal)] bg-[rgba(16,185,129,0.12)] text-[var(--accent-teal)]'
                      : 'border-[var(--line)] bg-white text-[var(--text-primary)] hover:bg-[rgba(16,185,129,0.08)]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge label={`${selectedCount} active in this lane`} tone="success" />
              <StatusBadge label={`${approvedCount} approved`} tone={approvedCount > 0 ? 'success' : 'neutral'} />
              <StatusBadge label={`${needsReviewCount} need review`} tone={needsReviewCount > 0 ? 'warning' : 'neutral'} />
            </div>

            <InlineStateNote
              tone="info"
              message={
                activeCategory === 'All'
                  ? `Showing all capability options inside ${group.title}.`
                  : `Showing ${activeCategory} inside ${group.title}.`
              }
            />
          </div>
        </Card>

        {serviceTypesQuery.isLoading || capabilitiesQuery.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-72 rounded-[28px]" />
            ))}
          </div>
        ) : serviceTypesQuery.isError || capabilitiesQuery.isError ? (
          <EmptyState
            icon={<Layers3 className="size-5" />}
            title="This capability lane is not loading right now"
            description="Refresh and try again in a moment."
          />
        ) : filteredServiceTypes.length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="No capability matches this view"
            description="Try a broader search or switch subcategory to reopen the full lane."
          />
        ) : (
          <div className="space-y-4">
            {filteredServiceTypes.map((serviceType) => {
              const draft = drafts[serviceType.id] ?? makeDefaultCapability();

              return (
                <Card key={serviceType.id} className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-3 text-sm font-semibold text-[var(--text-primary)]">
                          <input
                            type="checkbox"
                            checked={draft.enabled}
                            onChange={(event) => updateDraft(serviceType.id, { enabled: event.target.checked })}
                            className="size-4 rounded border border-[var(--line)]"
                          />
                          {serviceType.name}
                        </label>
                        {draft.approved_by_admin ? (
                          <StatusBadge label="Admin approved" tone="success" />
                        ) : draft.review_state === 'returned' ? (
                          <StatusBadge label="Returned for changes" tone="warning" />
                        ) : draft.enabled ? (
                          <StatusBadge label="Pending admin review" tone="warning" />
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{serviceType.description || 'No description yet.'}</p>
                      {draft.review_state === 'returned' && draft.admin_review_note ? (
                        <p className="mt-3 rounded-[18px] border border-[rgba(245,158,11,0.22)] bg-[rgba(254,249,195,0.55)] px-4 py-3 text-sm leading-7 text-[var(--text-primary)]">
                          Admin note: {draft.admin_review_note}
                        </p>
                      ) : null}
                      {draft.reviewed_at ? (
                        <div className="mt-3 rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]">
                          <p>Last review: {formatDateTime(draft.reviewed_at)}</p>
                          <p>Reviewed by: {draft.reviewed_by_admin?.email || 'WOLFIX admin'}</p>
                        </div>
                      ) : null}
                    </div>
                    {draft.enabled && draft.starting_price_tzs ? (
                      <div className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Starting price</p>
                        <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                          {formatMoney(Number(draft.starting_price_tzs) * 100)}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {draft.enabled ? (
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Experience level</label>
                        <input
                          type="text"
                          value={draft.experience_level}
                          onChange={(event) => updateDraft(serviceType.id, { experience_level: event.target.value })}
                          className="mt-3 w-full rounded-[18px] border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                          placeholder="standard, senior, expert..."
                        />
                      </div>

                      <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Starting price</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={draft.starting_price_tzs}
                          onChange={(event) => updateDraft(serviceType.id, { starting_price_tzs: event.target.value })}
                          className="mt-3 w-full rounded-[18px] border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                          placeholder="Enter amount in TZS"
                        />
                        <p className="mt-2 text-xs text-[var(--text-secondary)]">
                          Write the normal Tanzania shilling amount, for example `777000`.
                        </p>
                      </div>

                      <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Current capacity</label>
                        <select
                          value={draft.capacity_status}
                          onChange={(event) =>
                            updateDraft(serviceType.id, {
                              capacity_status: event.target.value as DraftCapability['capacity_status'],
                            })
                          }
                          className="mt-3 w-full rounded-[18px] border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                        >
                          <option value="available">Available</option>
                          <option value="limited">Limited</option>
                          <option value="unavailable">Unavailable</option>
                        </select>
                      </div>

                      <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Turnaround note</label>
                        <input
                          type="text"
                          value={draft.turnaround_note}
                          onChange={(event) => updateDraft(serviceType.id, { turnaround_note: event.target.value })}
                          className="mt-3 w-full rounded-[18px] border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                          placeholder="Example: 5 working days"
                        />
                      </div>

                      <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-4 lg:col-span-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Portfolio or delivery note</label>
                        <textarea
                          value={draft.portfolio_summary}
                          onChange={(event) => updateDraft(serviceType.id, { portfolio_summary: event.target.value })}
                          className="mt-3 min-h-[120px] w-full rounded-[18px] border border-[var(--line)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--brand-primary)]"
                          placeholder="Share the kind of work you have handled before or what makes your team strong in this lane."
                        />
                      </div>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button className="w-full sm:w-auto" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving this lane...' : 'Save this capability lane'}
          </Button>
          <Link href="/dashboard/vendor-requests" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto">
              Open matched requests
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>

        <InlineStateNote
          tone="success"
          message={`You have ${selectedCount} active capability option${selectedCount === 1 ? '' : 's'} in this lane. After you save, WOLFIX can review and match the right requests into your vendor queue.`}
        />
      </div>
    </DashboardShell>
  );
}
