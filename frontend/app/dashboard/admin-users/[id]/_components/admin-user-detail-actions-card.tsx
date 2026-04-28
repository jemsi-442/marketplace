'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AdminUserRecord } from '@/lib/types';

interface AdminUserDetailActionsCardProps {
  isDeleting: boolean;
  isTogglingLock: boolean;
  user: AdminUserRecord;
  onDeleteUser: () => void;
  onToggleLock: () => void;
}

export function AdminUserDetailActionsCard({
  isDeleting,
  isTogglingLock,
  user,
  onDeleteUser,
  onToggleLock,
}: AdminUserDetailActionsCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Account actions
      </p>
      <div className="mt-5 grid gap-3">
        <Button
          className="w-full sm:w-auto"
          variant="ghost"
          onClick={onToggleLock}
          disabled={isTogglingLock}
        >
          {isTogglingLock
            ? 'Updating...'
            : user.is_locked
              ? 'Unlock account'
              : 'Lock account'}
        </Button>
        <Button
          className="w-full border-[rgba(220,38,38,0.18)] text-[rgb(153,27,27)] hover:bg-[rgba(254,242,242,0.9)] hover:text-[rgb(127,29,29)] sm:w-auto"
          variant="ghost"
          onClick={() => {
            if (window.confirm(`Delete ${user.email}?`)) {
              onDeleteUser();
            }
          }}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete account'}
        </Button>
        <Link href="/dashboard/admin-users" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto" variant="ghost">
            Back to users
          </Button>
        </Link>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
          Keep search and navigation on the list page. Use this page only for
          this one account.
        </div>
      </div>
    </Card>
  );
}
