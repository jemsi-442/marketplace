'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

import {
  PAGE_SIZE,
  resolveProviderCode,
  withdrawalSchema,
  type WithdrawalFormInput,
  type WithdrawalFormValues,
  type WithdrawalView,
  WITHDRAWAL_PAGE_STALE_MS,
} from './vendor-withdrawals.utils';

export function useVendorWithdrawals() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const roles = user?.roles ?? [];
  const isAdmin =
    roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
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

  const canLoadVendorLane =
    hydrated && Boolean(token) && Boolean(user) && isVendor;

  const form = useForm<WithdrawalFormInput, undefined, WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount_tzs: '',
      msisdn: '',
      provider: 'MPESA',
    },
  });

  const watchedAmountTzs =
    useWatch({ control: form.control, name: 'amount_tzs' }) ?? '';
  const watchedMsisdn = useWatch({ control: form.control, name: 'msisdn' }) ?? '';
  const watchedProvider =
    useWatch({ control: form.control, name: 'provider' }) ?? '';

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
        provider: resolveProviderCode(values.provider),
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
        queryClient.invalidateQueries({
          queryKey: ['withdrawal-summary', token, 'TZS'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['vendor-withdrawals-page', token],
        }),
      ]);
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Unable to request withdrawal',
      );
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

  const onSubmit = form.handleSubmit(async (values) => {
    setFeedback(null);
    await submitWithdrawal.mutateAsync(values);
  });

  return {
    hydrated,
    user,
    isVendor,
    feedback,
    view,
    search,
    form,
    formErrors,
    watchedAmountTzs,
    watchedMsisdn,
    watchedProvider,
    currentPage,
    totalPages,
    items,
    listSummary,
    queries: {
      summary,
      withdrawals,
    },
    status: {
      isSubmittingWithdrawal: submitWithdrawal.isPending,
    },
    actions: {
      dismissFeedback: () => setFeedback(null),
      applyView: (nextView: WithdrawalView) => {
        setView(nextView);
        setPage(1);
      },
      setSearch: (value: string) => {
        setSearch(value);
        setPage(1);
      },
      goToPreviousPage: () => setPage((value) => Math.max(1, value - 1)),
      goToNextPage: () =>
        setPage((value) => Math.min(totalPages, value + 1)),
      submitForm: onSubmit,
    },
  };
}

export type VendorWithdrawalsModel = ReturnType<typeof useVendorWithdrawals>;
