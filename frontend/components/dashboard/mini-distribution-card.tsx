interface MiniDistributionItem {
  label: string;
  value: number;
  accent: string;
}

interface MiniDistributionCardProps {
  eyebrow: string;
  title: string;
  description: string;
  items: MiniDistributionItem[];
}

export function MiniDistributionCard({
  eyebrow,
  title,
  description,
  items,
}: MiniDistributionCardProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.96)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{eyebrow}</p>
          <h3 className="mt-2 font-display text-[1.35rem] leading-tight tracking-[-0.03em] text-[var(--text-primary)]">{title}</h3>
          <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{description}</p>
        </div>
        <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Signal map
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Total</p>
          <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{total}</p>
        </div>
        <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Top segment</p>
          <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{items.reduce((best, item) => (item.value > best.value ? item : best), items[0])?.label ?? 'None'}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: item.accent }} />
                {item.label}
              </span>
              <span className="text-sm text-[var(--text-primary)]">{item.value}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[rgba(226,232,240,0.9)]">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.min((item.value / maxValue) * 100, 100)}%`,
                  backgroundColor: item.accent,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
