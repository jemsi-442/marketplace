import { getRequestReviewInsight } from '@/lib/services/request-review-insights';
import type { AdminClientRequestRecord } from '@/lib/types';

export type AdminRequestStatusView = 'all' | 'needs_review' | 'awaiting_payment';

export const PAGE_SIZE = 10;
export const ADMIN_REQUEST_REFRESH_MS = 60_000;
export const ADMIN_REQUEST_STALE_MS = 30_000;

export function getRequestTone(status: string): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'awaiting_payment':
    case 'vendor_selected':
      return 'warning';
    case 'funded':
    case 'completed':
      return 'success';
    case 'vendor_interest_open':
    case 'matched':
      return 'info';
    default:
      return 'neutral';
  }
}

export function formatMoney(amount?: number | null, currency = 'TZS'): string {
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

export function getInterestTone(status: string): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'neutral';
    case 'shortlisted':
      return 'warning';
    default:
      return 'info';
  }
}

export function getRequestListSummary(view: AdminRequestStatusView, search: string): string {
  return view === 'needs_review'
    ? 'Showing requests that still need proposal review and vendor selection'
    : view === 'awaiting_payment'
      ? 'Showing requests already prepared for client payment'
      : search.trim()
        ? `Showing requests for "${search.trim()}"`
        : 'Showing all request records';
}

export function getLaneListSummary(request: AdminClientRequestRecord): string {
  const laneInsight = getRequestReviewInsight(request.service_type.group_slug, request.service_type.group_title);

  return request.service_type.group_slug === 'business-finance-support'
    ? 'Review control, reporting depth, and price.'
    : request.service_type.group_slug === 'content-media-communications'
      ? 'Review output fit, quality, and price.'
      : request.service_type.group_slug === 'training-research-documentation'
        ? 'Review writing rigor, structure, and price.'
        : `Review fit, timing, and price inside ${laneInsight.laneLabel.toLowerCase()}.`;
}
