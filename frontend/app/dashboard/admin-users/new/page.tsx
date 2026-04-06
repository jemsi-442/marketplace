'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type { AdminUserInput } from '@/lib/types';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

function makeDefaultForm(): AdminUserInput {
  return {
    email: '',
    password: '',
    account_type: 'client',
    is_verified: true,
    is_locked: false,
  };
}

export default function AdminNewUserPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const actor = useAuthStore((state) => state.user);
  const roles = actor?.roles ?? [];
  const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<AdminUserInput>(makeDefaultForm());

  const accountOptions: Array<{ value: AdminUserInput['account_type']; label: string }> = useMemo(
    () => [
      { value: 'client', label: 'Client' },
      { value: 'vendor', label: 'Vendor' },
      ...(isSuperAdmin ? [{ value: 'admin' as const, label: 'Admin' }, { value: 'super_admin' as const, label: 'Super admin' }] : []),
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
        throw new Error('Password is required and must be at least 8 characters.');
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
      setFeedback(error instanceof Error ? error.message : 'Unable to create this user.');
    },
  });

  return (
    <DashboardShell
      title="New user"
      subtitle="Create one account here, then move to the user page only if more changes are needed."
      mobileQuickActions={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Link href="/dashboard/admin-users">
            <Button size="sm" variant="ghost" className="w-full">Back</Button>
          </Link>
          <Link href="/dashboard/admin">
            <Button size="sm" variant="ghost" className="w-full">Admin</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {feedback ? <FeedbackBanner message={feedback} tone={inferFeedbackTone(feedback)} onDismiss={() => setFeedback(null)} /> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Create user</p>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Add one account</h2>
            </div>

            <div className="mt-5 grid gap-4 md:max-w-2xl">
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="new-user-email">Email</label>
                <input
                  id="new-user-email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="new-user-password">Password</label>
                <input
                  id="new-user-password"
                  type="password"
                  value={form.password ?? ''}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                  placeholder="Password123"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="new-user-type">Account type</label>
                <select
                  id="new-user-type"
                  value={form.account_type}
                  onChange={(event) => setForm((current) => ({ ...current, account_type: event.target.value as AdminUserInput['account_type'] }))}
                  className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                >
                  {accountOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={form.is_verified}
                    onChange={(event) => setForm((current) => ({ ...current, is_verified: event.target.checked }))}
                    className="size-4 rounded border border-[var(--line)]"
                  />
                  Verified
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={form.is_locked}
                    onChange={(event) => setForm((current) => ({ ...current, is_locked: event.target.checked }))}
                    className="size-4 rounded border border-[var(--line)]"
                  />
                  Locked
                </label>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Button className="w-full sm:w-auto" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create user'}
                </Button>
                <Link href="/dashboard/admin-users" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto" variant="ghost">Back to users</Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Next step</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              <p>Create the account here first.</p>
              <p>Open the user page only when you need more edits, lock changes, or deletion.</p>
              <p>Vendor accounts are prepared for the vendor lane automatically.</p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
