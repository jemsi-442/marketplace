'use client';

import { z } from 'zod';

import {
  normalizeMobileMoneyProviderCode,
  normalizeTanzanianMsisdn,
} from '@/lib/finance/mobile-money';

export const PAGE_SIZE = 10;
export const WITHDRAWAL_PAGE_STALE_MS = 60_000;

export const withdrawalSchema = z.object({
  amount_tzs: z
    .string()
    .trim()
    .min(1, 'Enter a valid amount')
    .refine(
      (value) => /^\d+$/.test(value),
      'Use whole Tanzania shilling amounts only',
    )
    .transform((value) => Number.parseInt(value, 10))
    .refine(
      (value) => Number.isInteger(value) && value > 0,
      'Enter a valid amount',
    ),
  msisdn: z
    .string()
    .min(1, 'Phone number is required')
    .transform((value) => normalizeTanzanianMsisdn(value))
    .refine(
      (value) => /^255[67]\d{8}$/.test(value),
      'Use a Tanzania mobile number like 07XXXXXXXX or 2557XXXXXXX',
    ),
  provider: z.string().min(2, 'Provider is required'),
});

export type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;
export type WithdrawalFormInput = z.input<typeof withdrawalSchema>;
export type WithdrawalView =
  | 'all'
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed';

export const WITHDRAWAL_VIEW_OPTIONS: Array<{
  value: WithdrawalView;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
];

export function formatBuyerMoney(
  amount?: number | null,
  currency = 'TZS',
): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '--';
  }

  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function getWithdrawalTone(
  status?: string | null,
): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'REQUESTED':
    case 'APPROVED':
      return 'warning';
    case 'PROCESSING':
      return 'info';
    case 'PAID':
      return 'success';
    case 'FAILED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return '--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-TZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function resolveProviderCode(value: string): string {
  return normalizeMobileMoneyProviderCode(value) ?? value.toUpperCase();
}
