export interface AnalyticsSnapshotChipItem {
  label: string;
  value: number | string;
  color: string;
}

interface AnalyticsSnapshotChipsProps {
  items: AnalyticsSnapshotChipItem[];
}

export function AnalyticsSnapshotChips({ items }: AnalyticsSnapshotChipsProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/92 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
        >
          <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
          <span className="text-[var(--text-primary)]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
