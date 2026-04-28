'use client';

export const VENDOR_REQUEST_REFRESH_MS = 60_000;
export const VENDOR_REQUEST_STALE_MS = 30_000;

export function formatVendorRequestDetailMoney(
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

export function toMinorAmountFromTzsInput(value: string): number | null {
  const normalized = value.trim();

  if (normalized === '') {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function formatVendorRequestDetailDateTime(
  value?: string | null,
): string {
  if (!value) {
    return 'Just now';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-TZ');
}
