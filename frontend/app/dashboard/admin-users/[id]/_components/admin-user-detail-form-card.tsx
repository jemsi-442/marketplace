'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AdminUserInput } from '@/lib/types';

interface AdminUserDetailFormCardProps {
  activeForm: AdminUserInput;
  accountOptions: Array<{
    value: AdminUserInput['account_type'];
    label: string;
  }>;
  isUpdating: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onAccountTypeChange: (value: AdminUserInput['account_type']) => void;
  onVerifiedChange: (value: boolean) => void;
  onLockedChange: (value: boolean) => void;
  onUpdateUser: () => void;
}

export function AdminUserDetailFormCard({
  activeForm,
  accountOptions,
  isUpdating,
  onEmailChange,
  onPasswordChange,
  onAccountTypeChange,
  onVerifiedChange,
  onLockedChange,
  onUpdateUser,
}: AdminUserDetailFormCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Update account
      </p>
      <div className="mt-5 grid gap-4 md:max-w-2xl">
        <div>
          <label
            className="text-sm font-medium text-[var(--text-primary)]"
            htmlFor="detail-user-email"
          >
            Email
          </label>
          <input
            id="detail-user-email"
            value={activeForm.email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-[var(--text-primary)]"
            htmlFor="detail-user-password"
          >
            New password
          </label>
          <input
            id="detail-user-password"
            type="password"
            value={activeForm.password ?? ''}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Leave blank to keep the current password"
            className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-[var(--text-primary)]"
            htmlFor="detail-user-type"
          >
            Account type
          </label>
          <select
            id="detail-user-type"
            value={activeForm.account_type}
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
              checked={activeForm.is_verified}
              onChange={(event) => onVerifiedChange(event.target.checked)}
              className="size-4 rounded border border-[var(--line)]"
            />
            Verified
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={activeForm.is_locked}
              onChange={(event) => onLockedChange(event.target.checked)}
              className="size-4 rounded border border-[var(--line)]"
            />
            Locked
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <Button
            className="w-full sm:w-auto"
            onClick={onUpdateUser}
            disabled={isUpdating}
          >
            {isUpdating ? 'Saving...' : 'Update user'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
