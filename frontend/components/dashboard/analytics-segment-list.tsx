import type { RingSegmentGeometry } from '@/components/dashboard/chart-utils';

interface AnalyticsSegmentListProps {
  items: RingSegmentGeometry[];
}

export function AnalyticsSegmentList({ items }: AnalyticsSegmentListProps) {
  return (
    <div className="mt-5 space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
          <span className="text-[var(--text-primary)]">
            {item.value} <span className="text-[var(--text-tertiary)]">{item.percentage}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}
