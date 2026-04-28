'use client';

import { Search, WalletCards } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import type { WithdrawalRecord } from '@/lib/types';
import { getMobileMoneyProviderLabel } from '@/lib/finance/mobile-money';

import {
  formatBuyerMoney,
  formatDateTime,
  getWithdrawalTone,
  type WithdrawalView,
  WITHDRAWAL_VIEW_OPTIONS,
} from '../vendor-withdrawals.utils';

interface WithdrawalHistoryCardProps {
  currentPage: number;
  items: WithdrawalRecord[];
  search: string;
  totalPages: number;
  view: WithdrawalView;
  isLoading: boolean;
  isError: boolean;
  onSearchChange: (value: string) => void;
  onApplyView: (view: WithdrawalView) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function WithdrawalHistoryCard({
  currentPage,
  items,
  search,
  totalPages,
  view,
  isLoading,
  isError,
  onSearchChange,
  onApplyView,
  onPreviousPage,
  onNextPage,
}: WithdrawalHistoryCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          History
        </p>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          Open one request at a time
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
          <Search className="size-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search reference, provider, or status"
            className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {WITHDRAWAL_VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onApplyView(option.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                view === option.value
                  ? 'border-[var(--brand-primary)] bg-[rgba(59,130,246,0.12)] text-[var(--brand-primary)]'
                  : 'border-[var(--line)] bg-white text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.08)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-[22px]" />
            ))
          ) : isError ? (
            <EmptyState
              icon={<WalletCards className="size-5" />}
              title="Withdrawals are not loading right now"
              description="Refresh and try again in a moment."
            />
          ) : !items.length ? (
            <EmptyState
              icon={<WalletCards className="size-5" />}
              title="No withdrawals in this view"
              description="Open another filter or send your first payout request."
            />
          ) : (
            <>
              {items.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                          {withdrawal.reference}
                        </p>
                        <StatusBadge
                          label={withdrawal.status}
                          tone={getWithdrawalTone(withdrawal.status)}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                        <span>
                          {formatBuyerMoney(
                            withdrawal.amount_minor,
                            withdrawal.currency,
                          )}
                        </span>
                        <span>
                          {getMobileMoneyProviderLabel(withdrawal.provider)}
                        </span>
                        <span>{withdrawal.destination_msisdn}</span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Created {formatDateTime(withdrawal.created_at)}
                        {withdrawal.completed_at
                          ? ` • Completed ${formatDateTime(withdrawal.completed_at)}`
                          : ''}
                      </p>
                      {withdrawal.failure_reason ? (
                        <p className="mt-2 text-sm text-rose-700">
                          {withdrawal.failure_reason}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[var(--line)] bg-white px-4 py-4">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      onClick={onPreviousPage}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={onNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
