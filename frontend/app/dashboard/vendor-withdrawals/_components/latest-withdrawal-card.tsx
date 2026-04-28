'use client';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { WithdrawalSummary } from '@/lib/types';

import {
  formatBuyerMoney,
  formatDateTime,
  getWithdrawalTone,
} from '../vendor-withdrawals.utils';

interface LatestWithdrawalCardProps {
  summary: WithdrawalSummary;
}

export function LatestWithdrawalCard({
  summary,
}: LatestWithdrawalCardProps) {
  if (!summary.latest_withdrawal) {
    return null;
  }

  return (
    <Card className="rounded-[24px] border border-[rgba(15,23,42,0.08)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
        Latest request
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {summary.latest_withdrawal.reference}
        </p>
        <StatusBadge
          label={summary.latest_withdrawal.status}
          tone={getWithdrawalTone(summary.latest_withdrawal.status)}
        />
      </div>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        {formatBuyerMoney(
          summary.latest_withdrawal.amount_minor,
          summary.currency,
        )}{' '}
        • {formatDateTime(summary.latest_withdrawal.created_at)}
      </p>
    </Card>
  );
}
