'use client';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminUserRecord } from '@/lib/types';

import {
  formatAdminUserDateTime,
  getAdminAccountTypeLabel,
} from '../../admin-users.utils';

interface AdminUserDetailSummaryCardProps {
  user: AdminUserRecord;
}

export function AdminUserDetailSummaryCard({
  user,
}: AdminUserDetailSummaryCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
        Account summary
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
        {user.email}
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge
          label={getAdminAccountTypeLabel(user.account_type)}
          tone="info"
        />
        {user.is_verified ? (
          <StatusBadge label="Verified" tone="success" />
        ) : (
          <StatusBadge label="Unverified" tone="warning" />
        )}
        {user.is_locked ? (
          <StatusBadge label="Locked" tone="warning" />
        ) : (
          <StatusBadge label="Active" tone="success" />
        )}
      </div>
      <p className="mt-4 text-sm text-[var(--text-secondary)]">
        Created: {formatAdminUserDateTime(user.created_at)}
      </p>
    </Card>
  );
}
