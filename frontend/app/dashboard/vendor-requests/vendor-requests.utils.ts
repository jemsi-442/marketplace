'use client';

export const PAGE_SIZE = 10;
export const VENDOR_REQUESTS_STALE_MS = 60_000;

export type ProposalView = 'all' | 'needs_proposal' | 'sent';

export const proposalViewOptions: Array<{
  value: ProposalView;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'needs_proposal', label: 'Needs proposal' },
  { value: 'sent', label: 'Proposal sent' },
];

export function formatVendorRequestMoney(
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

export function getVendorRequestTone(
  hasInterest: boolean,
): 'info' | 'success' {
  return hasInterest ? 'success' : 'info';
}

export function getVendorRequestResultSummary(
  proposalView: ProposalView,
  search: string,
): string {
  const trimmed = search.trim();

  if (proposalView === 'needs_proposal') {
    return 'Showing requests that still need your proposal';
  }

  if (proposalView === 'sent') {
    return 'Showing requests where you already sent a proposal';
  }

  if (trimmed) {
    return `Showing request matches for "${trimmed}"`;
  }

  return 'Showing all matched requests';
}
