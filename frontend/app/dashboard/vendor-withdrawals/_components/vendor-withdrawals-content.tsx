'use client';

import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

import type { VendorWithdrawalsModel } from '../use-vendor-withdrawals';
import { LatestWithdrawalCard } from './latest-withdrawal-card';
import { VendorWithdrawalsSummaryGrid } from './vendor-withdrawals-summary-grid';
import { WithdrawalHistoryCard } from './withdrawal-history-card';
import { WithdrawalRequestCard } from './withdrawal-request-card';

interface VendorWithdrawalsContentProps {
  workspace: VendorWithdrawalsModel;
}

export function VendorWithdrawalsContent({
  workspace,
}: VendorWithdrawalsContentProps) {
  return (
    <div className="space-y-6">
      {workspace.feedback ? (
        <FeedbackBanner
          message={workspace.feedback}
          tone={inferFeedbackTone(workspace.feedback)}
          onDismiss={workspace.actions.dismissFeedback}
        />
      ) : null}

      <VendorWithdrawalsSummaryGrid
        activeView={workspace.view}
        balanceMinor={workspace.queries.summary.data?.balance_minor}
        currency={workspace.queries.summary.data?.currency || 'TZS'}
        isLoading={workspace.queries.summary.isLoading}
        listSummary={workspace.listSummary}
        onSelectView={workspace.actions.applyView}
      />

      {!workspace.queries.summary.isLoading && workspace.queries.summary.data ? (
        <LatestWithdrawalCard summary={workspace.queries.summary.data} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <WithdrawalRequestCard
          form={workspace.form}
          formErrors={workspace.formErrors}
          isSubmittingWithdrawal={workspace.status.isSubmittingWithdrawal}
          watchedAmountTzs={workspace.watchedAmountTzs}
          watchedMsisdn={workspace.watchedMsisdn}
          watchedProvider={workspace.watchedProvider}
          onSubmit={workspace.actions.submitForm}
        />

        <WithdrawalHistoryCard
          currentPage={workspace.currentPage}
          items={workspace.items}
          search={workspace.search}
          totalPages={workspace.totalPages}
          view={workspace.view}
          isLoading={workspace.queries.withdrawals.isLoading}
          isError={workspace.queries.withdrawals.isError}
          onSearchChange={workspace.actions.setSearch}
          onApplyView={workspace.actions.applyView}
          onPreviousPage={workspace.actions.goToPreviousPage}
          onNextPage={workspace.actions.goToNextPage}
        />
      </div>
    </div>
  );
}
