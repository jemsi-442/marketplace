import { StatusBadge } from '@/components/ui/status-badge';
import type { ThreadSummaryRecord } from '@/lib/types';

import { buildThreadKey, getStatusTone } from '../communications.utils';

interface ThreadListItemProps {
  item: ThreadSummaryRecord;
  isSelected: boolean;
  onSelect: (threadKey: string) => void;
}

export function ThreadListItem({ item, isSelected, onSelect }: ThreadListItemProps) {
  const threadKey = buildThreadKey(item.kind, item.id);

  return (
    <button
      type="button"
      onClick={() => onSelect(threadKey)}
      className={isSelected ? 'w-full rounded-2xl border border-[var(--brand-primary)] bg-[rgba(59,130,246,0.06)] p-4 text-left' : 'w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4 text-left'}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={item.kind === 'request' ? 'Request' : 'Booking'} tone="info" />
          <StatusBadge label={item.status} tone={getStatusTone(item.status)} />
          {item.unread_count > 0 ? <StatusBadge label={`${item.unread_count} unread`} tone="warning" /> : null}
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.preview}</p>
    </button>
  );
}
