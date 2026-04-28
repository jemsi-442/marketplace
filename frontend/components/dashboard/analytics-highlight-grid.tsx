export interface AnalyticsHighlightItem {
  label: string;
  value: string;
}

interface AnalyticsHighlightGridProps {
  items: AnalyticsHighlightItem[];
}

export function AnalyticsHighlightGrid({ items }: AnalyticsHighlightGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
        >
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.label}</p>
          <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
