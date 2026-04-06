'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import type { AdminUserInput } from '@/lib/types';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

const ADMIN_USER_DETAIL_STALE_MS = 60_000;

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-TZ');
}

export default function AdminUserDetailPage() {
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

  const accountOptions: Array<{ value: AdminUserInput['account_type']; label: string }> = useMemo(
    () => [
      { value: 'client', label: 'Client' },
      { value: 'vendor', label: 'Vendor' },
      ...(isSuperAdmin ? [{ value: 'admin' as const, label: 'Admin' }, { value: 'super_admin' as const, label: 'Super admin' }] : []),
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
        ...(activeForm.password?.trim() ? { password: activeForm.password.trim() } : {}),
      };

      return apiClient.updateAdminUser(token, userId, payload);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      setForm(null);
      await refreshAll();
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to update this user.');
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!token || !userQuery.data) {
        throw new Error('Authentication token missing');
      }

      return userQuery.data.is_locked ? apiClient.unlockAdminUser(token, userId) : apiClient.lockAdminUser(token, userId);
    },
    onSuccess: async (response) => {
      setFeedback(response.message);
      await refreshAll();
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to change lock state.');
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
      setFeedback(error instanceof Error ? error.message : 'Unable to delete this user.');
    },
  });

  return (
    <DashboardShell
      title="User"
      subtitle="Update one account here, then go back to the list when you are done."
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

        {userQuery.isLoading ? (
          <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Card>
        ) : userQuery.isError || !userQuery.data ? (
          <EmptyState icon={<Users className="size-5" />} title="This user is not loading right now" description="Go back to the user list and try again." />
        ) : (
          <>
            <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Account summary</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{userQuery.data.email}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge label={userQuery.data.account_type.replace('_', ' ')} tone="info" />
                {userQuery.data.is_verified ? <StatusBadge label="Verified" tone="success" /> : <StatusBadge label="Unverified" tone="warning" />}
                {userQuery.data.is_locked ? <StatusBadge label="Locked" tone="warning" /> : <StatusBadge label="Active" tone="success" />}
              </div>
              <p className="mt-4 text-sm text-[var(--text-secondary)]">Created: {formatDateTime(userQuery.data.created_at)}</p>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Update account</p>
                <div className="mt-5 grid gap-4 md:max-w-2xl">
                  <div>
                    <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="detail-user-email">Email</label>
                    <input
                      id="detail-user-email"
                      value={activeForm.email}
                      onChange={(event) => setForm((current) => ({ ...(current ?? baseForm), email: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="detail-user-password">New password</label>
                    <input
                      id="detail-user-password"
                      type="password"
                      value={activeForm.password ?? ''}
                      onChange={(event) => setForm((current) => ({ ...(current ?? baseForm), password: event.target.value }))}
                      placeholder="Leave blank to keep the current password"
                      className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="detail-user-type">Account type</label>
                    <select
                      id="detail-user-type"
                      value={activeForm.account_type}
                      onChange={(event) => setForm((current) => ({ ...(current ?? baseForm), account_type: event.target.value as AdminUserInput['account_type'] }))}
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
                        checked={activeForm.is_verified}
                        onChange={(event) => setForm((current) => ({ ...(current ?? baseForm), is_verified: event.target.checked }))}
                        className="size-4 rounded border border-[var(--line)]"
                      />
                      Verified
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={activeForm.is_locked}
                        onChange={(event) => setForm((current) => ({ ...(current ?? baseForm), is_locked: event.target.checked }))}
                        className="size-4 rounded border border-[var(--line)]"
                      />
                      Locked
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button className="w-full sm:w-auto" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Saving...' : 'Update user'}
                    </Button>
                    <Link href="/dashboard/admin-users" className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto" variant="ghost">Back to users</Button>
                    </Link>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Account actions</p>
                <div className="mt-5 grid gap-3">
                  <Button className="w-full sm:w-auto" variant="ghost" onClick={() => lockMutation.mutate()} disabled={lockMutation.isPending}>
                    {lockMutation.isPending ? 'Updating...' : userQuery.data.is_locked ? 'Unlock account' : 'Lock account'}
                  </Button>
                  <Button
                    className="w-full border-[rgba(220,38,38,0.18)] text-[rgb(153,27,27)] hover:bg-[rgba(254,242,242,0.9)] hover:text-[rgb(127,29,29)] sm:w-auto"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(`Delete ${userQuery.data.email}?`)) {
                        deleteMutation.mutate();
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete account'}
                  </Button>
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
                    Keep search and navigation on the list page. Use this page only for this one account.
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
