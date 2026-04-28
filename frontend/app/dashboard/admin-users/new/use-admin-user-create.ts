'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type { AdminUserInput } from '@/lib/types';

function makeDefaultForm(): AdminUserInput {
  return {
    email: '',
    password: '',
    account_type: 'client',
    is_verified: true,
    is_locked: false,
  };
}

export function useAdminUserCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const actor = useAuthStore((state) => state.user);
  const roles = actor?.roles ?? [];
  const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<AdminUserInput>(makeDefaultForm());

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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      const email = form.email.trim();
      const password = form.password?.trim() ?? '';

      if (!email) {
        throw new Error('Email is required.');
      }

      if (password.length < 8) {
        throw new Error(
          'Password is required and must be at least 8 characters.',
        );
      }

      return apiClient.createAdminUser(token, {
        email,
        password,
        account_type: form.account_type,
        is_verified: form.is_verified,
        is_locked: form.is_locked,
      });
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await queryClient.invalidateQueries({ queryKey: ['admin-users', token] });

      if (response.user?.id) {
        router.push(`/dashboard/admin-users/${response.user.id}`);
        return;
      }

      router.push('/dashboard/admin-users');
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Unable to create this user.',
      );
    },
  });

  return {
    accountOptions,
    feedback,
    form,
    status: {
      isCreating: createMutation.isPending,
    },
    actions: {
      dismissFeedback: () => setFeedback(null),
      setEmail: (value: string) =>
        setForm((current) => ({ ...current, email: value })),
      setPassword: (value: string) =>
        setForm((current) => ({ ...current, password: value })),
      setAccountType: (value: AdminUserInput['account_type']) =>
        setForm((current) => ({ ...current, account_type: value })),
      setIsVerified: (value: boolean) =>
        setForm((current) => ({ ...current, is_verified: value })),
      setIsLocked: (value: boolean) =>
        setForm((current) => ({ ...current, is_locked: value })),
      createUser: () => createMutation.mutate(),
    },
  };
}

export type AdminUserCreateModel = ReturnType<typeof useAdminUserCreate>;
