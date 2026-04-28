'use client';

import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import type { UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InlineStateNote } from '@/components/ui/inline-state-note';
import {
  formatMsisdnPreview,
  getMobileMoneyProviderLabel,
  MOBILE_MONEY_PROVIDERS,
  normalizeMobileMoneyProviderCode,
} from '@/lib/finance/mobile-money';

import {
  formatBuyerMoney,
  type WithdrawalFormInput,
  type WithdrawalFormValues,
} from '../vendor-withdrawals.utils';

interface WithdrawalRequestCardProps {
  form: UseFormReturn<
    WithdrawalFormInput,
    undefined,
    WithdrawalFormValues
  >;
  formErrors: string[];
  isSubmittingWithdrawal: boolean;
  watchedAmountTzs: string;
  watchedMsisdn: string;
  watchedProvider: string;
  onSubmit: () => void;
}

export function WithdrawalRequestCard({
  form,
  formErrors,
  isSubmittingWithdrawal,
  watchedAmountTzs,
  watchedMsisdn,
  watchedProvider,
  onSubmit,
}: WithdrawalRequestCardProps) {
  return (
    <Card className="rounded-[28px] border border-[rgba(15,23,42,0.08)] p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          Request payout
        </p>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          Send balance to mobile money
        </h2>
      </div>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <div>
          <label
            className="text-sm font-medium text-[var(--text-primary)]"
            htmlFor="withdrawal-amount"
          >
            Amount to withdraw (TZS)
          </label>
          <input
            id="withdrawal-amount"
            inputMode="numeric"
            className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
            placeholder="50000"
            {...form.register('amount_tzs')}
          />
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Enter the full Tanzania shilling amount, for example `50000` for
            TZS 50,000.
          </p>
          {watchedAmountTzs.trim() && /^\d+$/.test(watchedAmountTzs.trim()) ? (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Requesting:{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {formatBuyerMoney(
                  Number.parseInt(watchedAmountTzs.trim(), 10) * 100,
                  'TZS',
                )}
              </span>
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="text-sm font-medium text-[var(--text-primary)]"
            htmlFor="withdrawal-msisdn"
          >
            Phone number
          </label>
          <input
            id="withdrawal-msisdn"
            inputMode="tel"
            className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-primary)]"
            placeholder="07XXXXXXXX"
            {...form.register('msisdn', {
              onBlur: (event) => {
                const normalized = formatMsisdnPreview(event.target.value);
                form.setValue('msisdn', normalized, {
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
          {watchedMsisdn.trim() ? (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Normalized:{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {formatMsisdnPreview(watchedMsisdn)}
              </span>
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Mobile money network
            </label>
            <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
              Selected: {getMobileMoneyProviderLabel(watchedProvider)}
            </span>
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {MOBILE_MONEY_PROVIDERS.map((provider) => {
              const active =
                normalizeMobileMoneyProviderCode(watchedProvider) ===
                provider.code;

              return (
                <button
                  key={provider.code}
                  type="button"
                  onClick={() =>
                    form.setValue('provider', provider.code, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? 'border-[var(--brand-primary)] bg-[linear-gradient(180deg,rgba(99,102,241,0.06)_0%,#ffffff_100%)] shadow-[0_14px_34px_rgba(79,70,229,0.14)] ring-1 ring-[rgba(79,70,229,0.14)]'
                      : 'border-[var(--line)] bg-white hover:border-[rgba(79,70,229,0.24)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-14 w-28 items-center justify-center overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] ${provider.logoShellClassName}`}
                    >
                      <Image
                        src={provider.logoPath}
                        alt={provider.label}
                        width={112}
                        height={56}
                        className="max-h-full w-full object-contain"
                      />
                    </div>
                    {active ? (
                      <CheckCircle2 className="size-5 shrink-0 text-[var(--brand-primary)]" />
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {provider.label}
                      </p>
                      {active ? (
                        <span className="rounded-full bg-[rgba(79,70,229,0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {provider.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {formErrors.length ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formErrors.join(' ')}
          </div>
        ) : null}

        {watchedMsisdn.trim() && watchedProvider.trim() ? (
          <InlineStateNote
            tone="success"
            message="Withdrawal details look ready."
          />
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmittingWithdrawal}>
            {isSubmittingWithdrawal
              ? 'Sending request...'
              : 'Request withdrawal'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
