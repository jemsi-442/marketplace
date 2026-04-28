'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AdminUserInput } from '@/lib/types';

interface AdminUserCreateFormCardProps {
  accountOptions: Array<{
    value: AdminUserInput['account_type'];
    label: string;
  }>;
  form: AdminUserInput;
  isCreating: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onAccountTypeChange: (value: AdminUserInput['account_type']) => void;
  onVerifiedChange: (value: boolean) => void;
  onLockedChange: (value: boolean) => void;
  onCreateUser: () => void;
}

export function AdminUserCreateFormCard({
  accountOptions,
  form,
  isCreating,
  onEmailChange,
  onPasswordChange,
  onAccountTypeChange,
  onVerifiedChange,
  onLockedChange,
  onCreateUser,
}: AdminUserCreateFormCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          Create user
        </p>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          Add one account
        </h2>
      </div>

      <div className="mt-5 grid gap-4 md:max-w-2xl">
        <div>
          <label
            className="text-sm font-medium text-[var(--text-primary)]"
            htmlFor="new-user-email"
          >
            Email
          </label>
          <input
            id="new-user-email"
            value={form.email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-[var(--text-primary)]"
            htmlFor="new-user-password"
          >
            Password
          </label>
          <input
            id="new-user-password"
            type="password"
            value={form.password ?? ''}
            onChange={(event) => onPasswordChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
            placeholder="Password123"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-[var(--text-primary)]"
            htmlFor="new-user-type"
          >
            Account type
          </label>
          <select
            id="new-user-type"
            value={form.account_type}
            onChange={(event) =>
              onAccountTypeChange(
                event.target.value as AdminUserInput['account_type'],
              )
            }
            className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
          >
            {accountOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={form.is_verified}
              onChange={(event) => onVerifiedChange(event.target.checked)}
              className="size-4 rounded border border-[var(--line)]"
            />
            Verified
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={form.is_locked}
              onChange={(event) => onLockedChange(event.target.checked)}
              className="size-4 rounded border border-[var(--line)]"
            />
            Locked
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <Button
            className="w-full sm:w-auto"
            onClick={onCreateUser}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create user'}
          </Button>
          <Link href="/dashboard/admin-users" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" variant="ghost">
              Back to users
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
