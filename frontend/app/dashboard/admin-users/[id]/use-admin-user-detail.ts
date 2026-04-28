'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type { AdminUserInput } from '@/lib/types';

const ADMIN_USER_DETAIL_STALE_MS = 60_000;

export function useAdminUserDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = Number(params.id);
  const token = useAuthStore((state) => state.token);
  const actor = useAuthStore((state) => state.user);
  const roles = actor?.roles ?? [];
  const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<AdminUserInput | null>(null);

  const userQuery = useQuery({
    queryKey: ['admin-user', token, userId],
    queryFn: () => apiClient.getAdminUser(token ?? '', userId),
    enabled: Boolean(token) && Number.isFinite(userId),
    staleTime: ADMIN_USER_DETAIL_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const baseForm = useMemo<AdminUserInput>(
    () => ({
      email: userQuery.data?.email ?? '',
      password: '',
      account_type: userQuery.data?.account_type ?? 'client',
      is_verified: userQuery.data?.is_verified ?? true,
      is_locked: userQuery.data?.is_locked ?? false,
    }),
    [userQuery.data],
  );

  const activeForm = form ?? baseForm;

  const accountOptions: Array<{
    value: AdminUserInput['account_type'];
    label: string;
  }> = useMemo(
    () => [
      { value: 'client', label: 'Client' },
      { value: 'vendor', label: 'Vendor' },
      ...(isSuperAdmin
        ? [
            { value: 'admin' as const, label: 'Admin' },
            { value: 'super_admin' as const, label: 'Super admin' },
          ]
        : []),
    ],
    [isSuperAdmin],
  );

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-user', token, userId] }),
      queryClient.invalidateQueries({ queryKey: ['admin-users', token] }),
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const payload: AdminUserInput = {
        email: activeForm.email.trim(),
        account_type: activeForm.account_type,
        is_verified: activeForm.is_verified,
        is_locked: activeForm.is_locked,
        ...(activeForm.password?.trim()
          ? { password: activeForm.password.trim() }
          : {}),
      };

      return apiClient.updateAdminUser(token, userId, payload);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setForm(null);
      await refreshAll();
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error ? error.message : 'Unable to update this user.',
      );
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!token || !userQuery.data) {
        throw new Error('Authentication token missing');
      }

      return userQuery.data.is_locked
        ? apiClient.unlockAdminUser(token, userId)
        : apiClient.lockAdminUser(token, userId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await refreshAll();
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Unable to change lock state.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      return apiClient.deleteAdminUser(token, userId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
      router.push('/dashboard/admin-users');
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Unable to delete this user.',
      );
    },
  });

  return {
    feedback,
    isSuperAdmin,
    userId,
    user: userQuery.data ?? null,
    activeForm,
    baseForm,
    accountOptions,
    queries: {
      userQuery,
    },
    status: {
      isUpdating: updateMutation.isPending,
      isTogglingLock: lockMutation.isPending,
      isDeleting: deleteMutation.isPending,
    },
    actions: {
      dismissFeedback: () => setFeedback(null),
      setEmail: (value: string) =>
        setForm((current) => ({ ...(current ?? baseForm), email: value })),
      setPassword: (value: string) =>
        setForm((current) => ({ ...(current ?? baseForm), password: value })),
      setAccountType: (value: AdminUserInput['account_type']) =>
        setForm((current) => ({
          ...(current ?? baseForm),
          account_type: value,
        })),
      setIsVerified: (value: boolean) =>
        setForm((current) => ({
          ...(current ?? baseForm),
          is_verified: value,
        })),
      setIsLocked: (value: boolean) =>
        setForm((current) => ({ ...(current ?? baseForm), is_locked: value })),
      updateUser: () => updateMutation.mutate(),
      toggleLock: () => lockMutation.mutate(),
      deleteUser: () => deleteMutation.mutate(),
    },
  };
}

export type AdminUserDetailModel = ReturnType<typeof useAdminUserDetail>;
