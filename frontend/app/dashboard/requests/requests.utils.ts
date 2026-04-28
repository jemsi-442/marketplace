import { getRequestReviewInsight } from '@/lib/services/request-review-insights';

export const PAGE_SIZE = 10;

export type ClientRequestStatusView =
  | 'all'
  | 'active'
  | 'awaiting_payment'
  | 'completed';

export const clientRequestStatusViewOptions: Array<{
  value: ClientRequestStatusView;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'awaiting_payment', label: 'Awaiting payment' },
  { value: 'completed', label: 'Completed' },
];

export function getClientRequestTone(
  status: string,
): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'awaiting_payment':
      return 'warning';
    case 'funded':
    case 'completed':
      return 'success';
    case 'vendor_interest_open':
    case 'vendor_selected':
    case 'revision_requested':
    case 'delivery_submitted':
      return 'info';
    default:
      return 'neutral';
  }
}

export function getClientRequestLaneListSummary(
  groupSlug?: string | null,
  groupTitle?: string | null,
): string {
  const laneInsight = getRequestReviewInsight(groupSlug, groupTitle);

  switch (groupSlug) {
    case 'business-finance-support':
      return 'Finance review is checking control, timing, and price.';
    case 'content-media-communications':
      return 'Communication review is checking fit, timing, and price.';
    case 'training-research-documentation':
      return 'Documentation review is checking rigor, timing, and price.';
    default:
      return `This request is moving inside ${laneInsight.laneLabel.toLowerCase()}.`;
  }
}
