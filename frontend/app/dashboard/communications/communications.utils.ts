import type { ThreadSummaryRecord } from '@/lib/types';

export type ThreadKind = 'request' | 'booking';
export type ThreadFilter = 'all' | 'request' | 'booking' | 'unread';

export const PAGE_SIZE = 10;
export const THREAD_REFRESH_MS = 60_000;
export const THREAD_STALE_MS = 20_000;

export function buildThreadKey(kind: ThreadKind, id: number): string {
  return `${kind}:${id}`;
}

export function getStatusTone(status: string): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'awaiting_payment':
    case 'vendor_selected':
      return 'warning';
    case 'funded':
    case 'completed':
    case 'approved':
      return 'success';
    case 'vendor_interest_open':
    case 'delivery_submitted':
    case 'revision_requested':
    case 'confirmed':
    case 'active':
      return 'info';
    default:
      return 'neutral';
  }
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Just now';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-TZ');
}

export function resolveSelectedThread(
  items: ThreadSummaryRecord[],
  requestedThreadKey: string | null,
): string | null {
  if (!items.length) {
    return null;
  }

  return items.some((item) => buildThreadKey(item.kind, item.id) === requestedThreadKey)
    ? requestedThreadKey
    : buildThreadKey(items[0].kind, items[0].id);
}
