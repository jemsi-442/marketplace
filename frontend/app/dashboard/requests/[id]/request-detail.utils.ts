export const REQUEST_DETAIL_REFRESH_MS = 60_000;
export const REQUEST_DETAIL_STALE_MS = 30_000;

export function formatClientRequestMoney(
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

export function getClientRequestDetailTone(
  status: string,
): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'awaiting_payment':
      return 'warning';
    case 'funded':
    case 'completed':
      return 'success';
    default:
      return 'info';
  }
}
