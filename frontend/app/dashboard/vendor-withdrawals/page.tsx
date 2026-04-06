'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Search, WalletCards } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

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
import { formatMsisdnPreview, getMobileMoneyProviderLabel, MOBILE_MONEY_PROVIDERS, normalizeMobileMoneyProviderCode, normalizeTanzanianMsisdn } from '@/lib/finance/mobile-money';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

const PAGE_SIZE = 10;
const WITHDRAWAL_PAGE_STALE_MS = 60_000;

const withdrawalSchema = z.object({
  amount_tzs: z
    .string()
    .trim()
    .min(1, 'Enter a valid amount')
    .refine((value) => /^\d+$/.test(value), 'Use whole Tanzania shilling amounts only')
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => Number.isInteger(value) && value > 0, 'Enter a valid amount'),
  msisdn: z
    .string()
    .min(1, 'Phone number is required')
    .transform((value) => normalizeTanzanianMsisdn(value))
    .refine((value) => /^255[67]\d{8}$/.test(value), 'Use a Tanzania mobile number like 07XXXXXXXX or 2557XXXXXXX'),
  provider: z.string().min(2, 'Provider is required'),
});

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;
type WithdrawalFormInput = z.input<typeof withdrawalSchema>;
type WithdrawalView = 'all' | 'pending' | 'processing' | 'paid' | 'failed';

function formatBuyerMoney(amount?: number | null, currency = 'TZS'): string {
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

function getWithdrawalTone(status?: string | null): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'REQUESTED':
    case 'APPROVED':
      return 'warning';
    case 'PROCESSING':
      return 'info';
    case 'PAID':
      return 'success';
    case 'FAILED':
      return 'danger';
    default:
      return 'neutral';
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-TZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function SummaryFilterCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <Card
      className={`rounded-[24px] border p-5 transition ${
        active
          ? 'border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.06)] shadow-[0_10px_24px_rgba(59,130,246,0.08)]'
          : 'border-[rgba(15,23,42,0.08)]'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{value}</p>
    </Card>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button type="button" onClick={onClick} className="text-left">
      {content}
    </button>
  );
}

export default function VendorWithdrawalsPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [view, setView] = useState<WithdrawalView>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!hydrated || !user) {
      return;
    }

    if (!isVendor) {
      router.replace(isAdmin ? '/dashboard/admin' : '/dashboard/client');
    }
  }, [hydrated, isAdmin, isVendor, router, user]);

  const canLoadVendorLane = hydrated && Boolean(token) && Boolean(user) && isVendor;

  const form = useForm<WithdrawalFormInput, undefined, WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount_tzs: '',
      msisdn: '',
      provider: 'MPESA',
    },
  });

  const watchedAmountTzs = useWatch({ control: form.control, name: 'amount_tzs' }) ?? '';
  const watchedMsisdn = useWatch({ control: form.control, name: 'msisdn' }) ?? '';
  const watchedProvider = useWatch({ control: form.control, name: 'provider' }) ?? '';

  const summary = useQuery({
    queryKey: ['withdrawal-summary', token, 'TZS'],
    queryFn: () => apiClient.getWithdrawalSummary(token ?? '', 'TZS'),
    enabled: canLoadVendorLane,
    staleTime: WITHDRAWAL_PAGE_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const withdrawals = useQuery({
    queryKey: ['vendor-withdrawals-page', token, { page, search, view }],
    queryFn: () =>
      apiClient.getWithdrawals(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search: search.trim(),
        view,
      }),
    enabled: canLoadVendorLane,
    staleTime: WITHDRAWAL_PAGE_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const submitWithdrawal = useMutation({
    mutationFn: async (values: WithdrawalFormValues) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.requestWithdrawal(token, {
        amount_minor: values.amount_tzs * 100,
        currency: 'TZS',
        msisdn: values.msisdn,
        provider: normalizeMobileMoneyProviderCode(values.provider) ?? values.provider.toUpperCase(),
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      form.reset({
        amount_tzs: '',
        msisdn: '',
        provider: 'MPESA',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['withdrawal-summary', token, 'TZS'] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-withdrawals-page', token] }),
      ]);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to request withdrawal');
    },
  });

  const formErrors = Object.values(form.formState.errors)
    .map((error) => error?.message)
    .filter((message): message is string => Boolean(message));

  const currentPage = withdrawals.data?.page ?? page;
  const totalPages = withdrawals.data?.total_pages ?? 1;
  const items = withdrawals.data?.items ?? [];
  const listSummary = withdrawals.data?.summary ?? {
    total: 0,
    pending: 0,
    processing: 0,
    paid: 0,
    failed: 0,
  };

  const applyView = (nextView: WithdrawalView) => {
    setView(nextView);
    setPage(1);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFeedback(null);
    await submitWithdrawal.mutateAsync(values);
  });

  if (!hydrated) {
    return (
      <DashboardShell title="Withdrawals" subtitle="Loading your vendor payout lane.">
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-[24px]" />
          <Skeleton className="h-80 rounded-[28px]" />
        </div>
      </DashboardShell>
    );
  }

  if (user && !isVendor) {
    return null;
  }

  return (
    <DashboardShell
      title="Withdrawals"
      subtitle="Move available vendor balance into your mobile money account from one clean page."
      mobileQuickActions={
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/vendor">
            <Button variant="ghost" className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5">
              Back
              <ArrowRight className="size-4 rotate-180" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)]">
              Bookings
              <WalletCards className="size-4" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {feedback ? <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} /> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summary.isLoading ? (
            Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-[24px]" />)
          ) : (
            <>
              <SummaryFilterCard
                label="Available balance"
                value={formatBuyerMoney(summary.data?.balance_minor, summary.data?.currency || 'TZS')}
              />
              <SummaryFilterCard label="All requests" value={listSummary.total} active={view === 'all'} onClick={() => applyView('all')} />
              <SummaryFilterCard label="Pending" value={listSummary.pending} active={view === 'pending'} onClick={() => applyView('pending')} />
              <SummaryFilterCard label="Processing" value={listSummary.processing} active={view === 'processing'} onClick={() => applyView('processing')} />
              <SummaryFilterCard label="Paid" value={listSummary.paid} active={view === 'paid'} onClick={() => applyView('paid')} />
            </>
          )}
        </div>

        {!summary.isLoading && summary.data?.latest_withdrawal ? (
          <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Latest request</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{summary.data.latest_withdrawal.reference}</p>
              <StatusBadge label={summary.data.latest_withdrawal.status} tone={getWithdrawalTone(summary.data.latest_withdrawal.status)} />
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {formatBuyerMoney(summary.data.latest_withdrawal.amount_minor, summary.data.currency)} • {formatDateTime(summary.data.latest_withdrawal.created_at)}
            </p>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Request payout</p>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Send balance to mobile money</h2>
            </div>

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="withdrawal-amount">Amount to withdraw (TZS)</label>
                <input
                  id="withdrawal-amount"
                  inputMode="numeric"
                  className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                  placeholder="50000"
                  {...form.register('amount_tzs')}
                />
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Enter the full Tanzania shilling amount, for example `50000` for TZS 50,000.
                </p>
                {watchedAmountTzs.trim() && /^\d+$/.test(watchedAmountTzs.trim()) ? (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Requesting: <span className="font-medium text-[var(--text-primary)]">{formatBuyerMoney(Number.parseInt(watchedAmountTzs.trim(), 10) * 100, 'TZS')}</span>
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="withdrawal-msisdn">Phone number</label>
                <input
                  id="withdrawal-msisdn"
                  inputMode="tel"
                  className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                  placeholder="07XXXXXXXX"
                  {...form.register('msisdn', {
                    onBlur: (event) => {
                      const normalized = formatMsisdnPreview(event.target.value);
                      form.setValue('msisdn', normalized, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    },
                  })}
                />
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Accepts `07XXXXXXXX`, `7XXXXXXXX`, `2557XXXXXXX`, or `+2557XXXXXXX`.
                </p>
                {watchedMsisdn.trim() ? (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Normalized: <span className="font-medium text-[var(--text-primary)]">{formatMsisdnPreview(watchedMsisdn)}</span>
                  </p>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Mobile money network</label>
                  <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                    Selected: {getMobileMoneyProviderLabel(watchedProvider)}
                  </span>
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {MOBILE_MONEY_PROVIDERS.map((provider) => {
                    const active = normalizeMobileMoneyProviderCode(watchedProvider) === provider.code;

                    return (
                      <button
                        key={provider.code}
                        type="button"
                        onClick={() =>
                          form.setValue('provider', provider.code, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          active
                            ? 'border-[var(--brand-primary)] bg-[linear-gradient(180deg,rgba(99,102,241,0.06)_0%,#ffffff_100%)] shadow-[0_14px_34px_rgba(79,70,229,0.14)] ring-1 ring-[rgba(79,70,229,0.14)]'
                            : 'border-[var(--line)] bg-white hover:border-[rgba(79,70,229,0.24)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className={`flex h-14 w-28 items-center justify-center overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] ${provider.logoShellClassName}`}>
                            <Image src={provider.logoPath} alt={provider.label} width={112} height={56} className="max-h-full w-full object-contain" />
                          </div>
                          {active ? <CheckCircle2 className="size-5 shrink-0 text-[var(--brand-primary)]" /> : null}
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{provider.label}</p>
                            {active ? (
                              <span className="rounded-full bg-[rgba(79,70,229,0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">{provider.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {formErrors.length ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formErrors.join(' ')}
                </div>
              ) : null}

              {(watchedMsisdn.trim() && watchedProvider.trim()) ? (
                <InlineStateNote tone="success" message="Withdrawal details look ready." />
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={submitWithdrawal.isPending}>
                  {submitWithdrawal.isPending ? 'Sending request...' : 'Request withdrawal'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">History</p>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Open one request at a time</h2>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <Search className="size-4 text-[var(--text-secondary)]" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search reference, provider, or status"
                  className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'failed', label: 'Failed' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => applyView(option.value as WithdrawalView)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      view === option.value
                        ? 'border-[var(--brand-primary)] bg-[rgba(59,130,246,0.12)] text-[var(--brand-primary)]'
                        : 'border-[var(--line)] bg-white text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.08)]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {withdrawals.isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[22px]" />)
                ) : withdrawals.isError ? (
                  <EmptyState icon={<WalletCards className="size-5" />} title="Withdrawals are not loading right now" description="Refresh and try again in a moment." />
                ) : !items.length ? (
                  <EmptyState icon={<WalletCards className="size-5" />} title="No withdrawals in this view" description="Open another filter or send your first payout request." />
                ) : (
                  <>
                    {items.map((withdrawal) => (
                      <div key={withdrawal.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold text-[var(--text-primary)]">{withdrawal.reference}</p>
                              <StatusBadge label={withdrawal.status} tone={getWithdrawalTone(withdrawal.status)} />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                              <span>{formatBuyerMoney(withdrawal.amount_minor, withdrawal.currency)}</span>
                              <span>{getMobileMoneyProviderLabel(withdrawal.provider)}</span>
                              <span>{withdrawal.destination_msisdn}</span>
                            </div>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              Created {formatDateTime(withdrawal.created_at)}
                              {withdrawal.completed_at ? ` • Completed ${formatDateTime(withdrawal.completed_at)}` : ''}
                            </p>
                            {withdrawal.failure_reason ? (
                              <p className="mt-2 text-sm text-rose-700">{withdrawal.failure_reason}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}

                    {totalPages > 1 ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-4">
                        <p className="text-sm text-[var(--text-secondary)]">
                          Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                            Previous
                          </Button>
                          <Button variant="ghost" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                            Next
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
