'use client';

import { Skeleton } from '@/components/ui/skeleton';

import { SummaryFilterCard } from './summary-filter-card';
import { formatBuyerMoney } from '../vendor-withdrawals.utils';
import type { WithdrawalView } from '../vendor-withdrawals.utils';

interface VendorWithdrawalsSummaryGridProps {
  activeView: WithdrawalView;
  balanceMinor: number | null | undefined;
  currency: string;
  isLoading: boolean;
  listSummary: {
    total: number;
    pending: number;
    processing: number;
    paid: number;
    failed: number;
  };
  onSelectView: (view: WithdrawalView) => void;
}

export function VendorWithdrawalsSummaryGrid({
  activeView,
  balanceMinor,
  currency,
  isLoading,
  listSummary,
  onSelectView,
}: VendorWithdrawalsSummaryGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {isLoading ? (
        Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[24px]" />
        ))
      ) : (
        <>
          <SummaryFilterCard
            label="Available balance"
            value={formatBuyerMoney(balanceMinor, currency)}
          />
          <SummaryFilterCard
            label="All requests"
            value={listSummary.total}
            active={activeView === 'all'}
            onClick={() => onSelectView('all')}
          />
          <SummaryFilterCard
            label="Pending"
            value={listSummary.pending}
            active={activeView === 'pending'}
            onClick={() => onSelectView('pending')}
          />
          <SummaryFilterCard
            label="Processing"
            value={listSummary.processing}
            active={activeView === 'processing'}
            onClick={() => onSelectView('processing')}
          />
          <SummaryFilterCard
            label="Paid"
            value={listSummary.paid}
            active={activeView === 'paid'}
            onClick={() => onSelectView('paid')}
          />
        </>
      )}
    </div>
  );
}
