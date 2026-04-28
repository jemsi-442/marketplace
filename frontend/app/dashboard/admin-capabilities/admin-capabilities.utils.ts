import { getAdminLaneReviewGuidance } from '@/lib/services/vendor-capability-review-insights';
import type { VendorServiceCapabilityRecord } from '@/lib/types';

export type CapabilityFilter = 'all' | 'pending' | 'approved' | 'returned';

export const FILTER_LABELS: Array<{ value: CapabilityFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'returned', label: 'Returned' },
];

export const PAGE_SIZE = 10;
export const ADMIN_CAPABILITIES_STALE_MS = 60_000;

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

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-TZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function getReviewTone(record: VendorServiceCapabilityRecord): 'success' | 'warning' | 'info' {
  if (record.approved_by_admin) {
    return 'success';
  }

  if (record.review_state === 'returned') {
    return 'warning';
  }

  return 'info';
}

export function getReviewLabel(record: VendorServiceCapabilityRecord): string {
  if (record.approved_by_admin) {
    return 'Approved';
  }

  if (record.review_state === 'returned') {
    return 'Returned';
  }

  return 'Pending review';
}

export function resolveCapabilityLaneLabel(record: VendorServiceCapabilityRecord): string {
  return record.service_type.group_title || record.service_type.category || 'Other capability lane';
}

export function groupCapabilitiesByLane(items: VendorServiceCapabilityRecord[]) {
  return items.reduce<Array<{ lane: string; items: VendorServiceCapabilityRecord[]; pressureHint: string }>>((groups, capability) => {
    const lane = resolveCapabilityLaneLabel(capability);
    const existing = groups.find((entry) => entry.lane === lane);

    if (existing) {
      existing.items.push(capability);
      return groups;
    }

    groups.push({
      lane,
      items: [capability],
      pressureHint: getAdminLaneReviewGuidance(
        capability.service_type.group_slug,
        capability.service_type.group_title,
      ).pressureHint,
    });
    return groups;
  }, []);
}
