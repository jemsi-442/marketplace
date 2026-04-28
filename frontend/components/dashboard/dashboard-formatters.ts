export function formatDashboardMoney(amountMinor: number, currency = 'TZS'): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function formatDashboardPercent(value: number): string {
  return `${Math.max(0, Math.min(Math.round(value), 100))}%`;
}
