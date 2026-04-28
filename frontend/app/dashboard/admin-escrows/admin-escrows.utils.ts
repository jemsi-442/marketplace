export const PAGE_SIZE = 10;
export const ADMIN_ESCROWS_STALE_MS = 60_000;

export type PendingEscrowAction = 'release' | 'refund' | undefined;

export function formatBuyerMoney(amount?: number | null, currency = 'TZS'): string {
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

export function formatEscrowOpenedAt(value?: string | null): string {
  if (!value) {
    return 'Recently opened';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-TZ');
}

export function parseAdminEscrowTags(value: string): string[] {
  return Array.from(new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))).slice(0, 8);
}
