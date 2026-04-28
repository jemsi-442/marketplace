import Image from 'next/image';
import type { ComponentProps } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import { formatMsisdnPreview, getMobileMoneyProviderLabel, MOBILE_MONEY_PROVIDERS, normalizeMobileMoneyProviderCode } from '@/lib/finance/mobile-money';
import type { BookingEscrowSummary } from '@/lib/types';

import type { CollectionFormValues, DisputeFormValues } from '../booking-workspace.schemas';
import type { BookingInlineSuccessState } from '../booking-workspace.utils';
import {
  formatBuyerMoney,
  formatDateTime,
  getEscrowResolutionLabel,
  getRoleNextMoveLabel,
  getRolePaymentStatusLabel,
} from '../booking-workspace.utils';

interface BookingPaymentPanelProps {
  bookingEscrow: BookingEscrowSummary | null;
  canManagePayment: boolean;
  isClient: boolean;
  isVendor: boolean;
  paymentPanelTitle: string;
  paymentEmptyStatus: string;
  showEscrowReviewContext: boolean;
  showCollectionForm: boolean;
  showDisputeForm: boolean;
  watchedCollectionMsisdn: string;
  watchedCollectionProvider: string;
  collectionReady: boolean;
  disputeReady: boolean;
  collectionErrors: string[];
  disputeErrors: string[];
  inlineSuccess: BookingInlineSuccessState | null;
  collectionForm: UseFormReturn<CollectionFormValues>;
  disputeForm: UseFormReturn<DisputeFormValues>;
  createEscrowPending: boolean;
  collectPaymentPending: boolean;
  releaseEscrowPending: boolean;
  disputeEscrowPending: boolean;
  onCreateEscrow: () => void;
  onReleaseEscrow: () => void;
  onToggleCollectionForm: () => void;
  onToggleDisputeForm: () => void;
  onCloseCollectionForm: () => void;
  onCloseDisputeForm: () => void;
  onCollectionSubmit: ComponentProps<'form'>['onSubmit'];
  onDisputeSubmit: ComponentProps<'form'>['onSubmit'];
}

export function BookingPaymentPanel({
  bookingEscrow,
  canManagePayment,
  isClient,
  isVendor,
  paymentPanelTitle,
  paymentEmptyStatus,
  showEscrowReviewContext,
  showCollectionForm,
  showDisputeForm,
  watchedCollectionMsisdn,
  watchedCollectionProvider,
  collectionReady,
  disputeReady,
  collectionErrors,
  disputeErrors,
  inlineSuccess,
  collectionForm,
  disputeForm,
  createEscrowPending,
  collectPaymentPending,
  releaseEscrowPending,
  disputeEscrowPending,
  onCreateEscrow,
  onReleaseEscrow,
  onToggleCollectionForm,
  onToggleDisputeForm,
  onCloseCollectionForm,
  onCloseDisputeForm,
  onCollectionSubmit,
  onDisputeSubmit,
}: BookingPaymentPanelProps) {
  const escrowResolutionLabel = getEscrowResolutionLabel(bookingEscrow?.resolution);

  return (
    <Card className="space-y-4 rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6" id="booking-controls-section">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Payment</p>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">{paymentPanelTitle}</h2>
      </div>
      <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Status</span>
          <span className="mt-2 block text-[var(--text-primary)]">
            {bookingEscrow
              ? getRolePaymentStatusLabel(bookingEscrow.status, isClient, isVendor)
              : paymentEmptyStatus}
          </span>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Protected amount</span>
          <span className="mt-2 block text-[var(--text-primary)]">{bookingEscrow ? formatBuyerMoney(bookingEscrow.amount_minor, bookingEscrow.currency) : '--'}</span>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Next move</span>
          <span className="mt-2 block text-[var(--text-primary)]">{getRoleNextMoveLabel(bookingEscrow?.status, isClient, isVendor)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {canManagePayment && !bookingEscrow ? (
          <Button className="w-full sm:w-auto" onClick={onCreateEscrow} disabled={createEscrowPending}>
            {createEscrowPending ? 'Protecting...' : 'Protect payment'}
          </Button>
        ) : null}
        {canManagePayment && bookingEscrow?.status === 'CREATED' ? (
          <Button className="w-full sm:w-auto" variant="ghost" onClick={onToggleCollectionForm}>
            {showCollectionForm ? 'Close form' : 'Open payment form'}
          </Button>
        ) : null}
        {canManagePayment && bookingEscrow?.status === 'ACTIVE' ? (
          <>
            <Button className="w-full sm:w-auto" onClick={onReleaseEscrow} disabled={releaseEscrowPending}>
              {releaseEscrowPending ? 'Releasing...' : 'Release payment'}
            </Button>
            <Button className="w-full sm:w-auto" variant="ghost" onClick={onToggleDisputeForm}>
              {showDisputeForm ? 'Close issue form' : 'Need help'}
            </Button>
          </>
        ) : null}
      </div>

      {showEscrowReviewContext ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-sm text-[var(--text-secondary)]">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Review record</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {bookingEscrow?.status === 'RESOLVED'
                ? 'This booking now carries the final dispute outcome and the admin review notes below.'
                : 'This booking already has dispute context attached so follow-up can stay grounded in the same facts.'}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {bookingEscrow?.disputed_at ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Dispute opened</p>
                <p className="mt-1 text-[var(--text-primary)]">{formatDateTime(bookingEscrow.disputed_at)}</p>
              </div>
            ) : null}
            {bookingEscrow?.resolved_at ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Review completed</p>
                <p className="mt-1 text-[var(--text-primary)]">{formatDateTime(bookingEscrow.resolved_at)}</p>
              </div>
            ) : null}
            {escrowResolutionLabel ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Outcome</p>
                <p className="mt-1 text-[var(--text-primary)]">{escrowResolutionLabel}</p>
              </div>
            ) : null}
            {bookingEscrow?.dispute_source?.trim() ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Source</p>
                <p className="mt-1 text-[var(--text-primary)]">{bookingEscrow.dispute_source.replaceAll('_', ' ')}</p>
              </div>
            ) : null}
          </div>

          {bookingEscrow?.dispute_reason?.trim() ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Dispute note</p>
              <p className="mt-2 leading-7 text-[var(--text-primary)]">{bookingEscrow.dispute_reason}</p>
            </div>
          ) : null}

          {bookingEscrow?.resolution_note?.trim() ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Resolution note</p>
              <p className="mt-2 leading-7 text-[var(--text-primary)]">{bookingEscrow.resolution_note}</p>
            </div>
          ) : null}

          {bookingEscrow?.evidence_summary?.trim() ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Evidence summary</p>
              <p className="mt-2 leading-7 text-[var(--text-primary)]">{bookingEscrow.evidence_summary}</p>
            </div>
          ) : null}

          {bookingEscrow?.tags?.length ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Review tags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {bookingEscrow.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!canManagePayment ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {isVendor
            ? 'The client completes payment on this booking. Use the thread for progress and delivery updates.'
            : 'Payment actions for this booking stay on the client lane. Use admin review tools if intervention is needed.'}
        </div>
      ) : null}

      {canManagePayment && showCollectionForm && bookingEscrow?.status === 'CREATED' ? (
        <form className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4" onSubmit={onCollectionSubmit}>
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="booking-msisdn">Phone number</label>
            <input
              id="booking-msisdn"
              inputMode="tel"
              className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
              placeholder="07XXXXXXXX"
              {...collectionForm.register('msisdn', {
                onBlur: (event) => {
                  const normalized = formatMsisdnPreview(event.target.value);
                  collectionForm.setValue('msisdn', normalized, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                },
              })}
            />
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Accepts `07XXXXXXXX`, `7XXXXXXXX`, `2557XXXXXXX`, or `+2557XXXXXXX`.
            </p>
            {watchedCollectionMsisdn.trim() ? (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Normalized: <span className="font-medium text-[var(--text-primary)]">{formatMsisdnPreview(watchedCollectionMsisdn)}</span>
              </p>
            ) : null}
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="booking-provider">Mobile money network</label>
              <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                Selected: {getMobileMoneyProviderLabel(watchedCollectionProvider)}
              </span>
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {MOBILE_MONEY_PROVIDERS.map((provider) => {
                const active = normalizeMobileMoneyProviderCode(watchedCollectionProvider) === provider.code;

                return (
                  <button
                    key={provider.code}
                    type="button"
                    onClick={() => {
                      collectionForm.setValue('provider', provider.code, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      active
                        ? 'border-[var(--brand-primary)] bg-[linear-gradient(180deg,rgba(99,102,241,0.06)_0%,#ffffff_100%)] shadow-[0_14px_34px_rgba(79,70,229,0.14)] ring-1 ring-[rgba(79,70,229,0.14)]'
                        : 'border-[var(--line)] bg-white hover:border-[rgba(79,70,229,0.24)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-14 w-28 items-center justify-center overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] ${provider.logoShellClassName}`}>
                        <Image
                          src={provider.logoPath}
                          alt={provider.label}
                          width={112}
                          height={56}
                          className="max-h-full w-full object-contain"
                        />
                      </div>
                      {active ? <CheckCircle2 className="size-5 shrink-0 text-[var(--brand-primary)]" /> : null}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{provider.label}</p>
                        {active ? (
                          <span className="rounded-full bg-[rgba(79,70,229,0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{provider.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              Choose the same network that will receive the payment prompt on the number above.
            </p>
          </div>
          {collectionErrors.length ? (
            <div id="booking-collection-summary" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {collectionErrors.join(' ')}
            </div>
          ) : null}
          {collectionReady ? <InlineStateNote tone="success" message="Payment request details look ready." /> : null}
          {inlineSuccess?.scope === 'collection' ? <InlineStateNote tone="success" message={inlineSuccess.message} /> : null}
          <div className="flex flex-wrap gap-3">
            <Button className="w-full sm:w-auto" type="submit" disabled={collectPaymentPending}>{collectPaymentPending ? 'Sending request...' : 'Send payment request'}</Button>
            <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={onCloseCollectionForm}>Cancel</Button>
          </div>
        </form>
      ) : null}

      {canManagePayment && showDisputeForm && bookingEscrow?.status === 'ACTIVE' ? (
        <form className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4" onSubmit={onDisputeSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="booking-dispute-reason">What should admin review?</label>
            <textarea
              id="booking-dispute-reason"
              rows={5}
              className="w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
              placeholder="Explain what is wrong with the delivery, payment step, or agreement so admin can review the facts."
              {...disputeForm.register('reason')}
            />
            <p className="text-xs text-[var(--text-secondary)]">
              Keep this focused on work quality, delivery status, scope mismatch, or payment concern.
            </p>
          </div>
          {disputeErrors.length ? (
            <div id="booking-dispute-summary" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {disputeErrors.join(' ')}
            </div>
          ) : null}
          {disputeReady ? <InlineStateNote tone="success" message="Your dispute note gives admin enough context to review this booking." /> : null}
          {inlineSuccess?.scope === 'dispute' ? <InlineStateNote tone="success" message={inlineSuccess.message} /> : null}
          <div className="flex flex-wrap gap-3">
            <Button className="w-full sm:w-auto" type="submit" disabled={disputeEscrowPending}>
              {disputeEscrowPending ? 'Opening issue...' : 'Send to admin review'}
            </Button>
            <Button type="button" className="w-full sm:w-auto" variant="ghost" onClick={onCloseDisputeForm}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
