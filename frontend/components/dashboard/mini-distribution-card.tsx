import { accentToRgba, formatCompactNumber, getSharePercentage } from '@/components/dashboard/chart-utils';

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
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const topItem = items.reduce((best, item) => (item.value > best.value ? item : best), items[0] ?? { label: 'None', value: 0, accent: 'var(--accent-slate)' });

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

      <div className="relative mt-4 overflow-hidden rounded-[22px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] p-4">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{
            background: `radial-gradient(circle at top right, ${accentToRgba(topItem.accent, 0.18)} 0%, rgba(255,255,255,0) 72%)`,
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Total flow</p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{formatCompactNumber(total)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Largest share</p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
              {topItem.label} {getSharePercentage(topItem.value, total)}%
            </p>
          </div>
        </div>

        <div className="mt-4 flex h-4 overflow-hidden rounded-full border border-[rgba(148,163,184,0.12)] bg-[rgba(226,232,240,0.48)] p-[3px]">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-full"
              style={{
                width: `${Math.max((item.value / Math.max(total, 1)) * 100, item.value > 0 ? 4 : 0)}%`,
                background: `linear-gradient(90deg, ${accentToRgba(item.accent, 0.95)} 0%, ${item.accent} 100%)`,
                boxShadow: `0 10px 22px ${accentToRgba(item.accent, 0.18)}`,
              }}
            />
          ))}
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
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {formatCompactNumber(item.value)} <span className="text-[var(--text-tertiary)]">{getSharePercentage(item.value, total)}%</span>
              </span>
            </div>
            <div className="mt-2 rounded-[16px] border border-[rgba(148,163,184,0.12)] bg-[rgba(248,250,252,0.96)] p-2">
              <div className="flex h-9 items-end gap-1.5 rounded-[12px] bg-[rgba(255,255,255,0.86)] px-2 py-1.5">
                {Array.from({ length: 10 }, (_, index) => {
                  const threshold = ((index + 1) / 10) * 100;
                  const active = getSharePercentage(item.value, total) >= threshold;

                  return (
                    <span
                      key={`${item.label}-${index}`}
                      className="block w-full rounded-full"
                      style={{
                        height: `${14 + ((index % 4) * 4)}px`,
                        background: active
                          ? `linear-gradient(180deg, ${accentToRgba(item.accent, 0.45)} 0%, ${item.accent} 100%)`
                          : 'linear-gradient(180deg, rgba(226,232,240,0.42) 0%, rgba(203,213,225,0.78) 100%)',
                        boxShadow: active ? `0 8px 18px ${accentToRgba(item.accent, 0.16)}` : 'none',
                        opacity: active ? 1 : 0.72,
                      }}
                    />
                  );
                })}
              </div>

              <div className="mt-2 h-2.5 rounded-full bg-[rgba(226,232,240,0.9)]">
              <div
                className="h-2.5 rounded-full"
                style={{
                  width: `${getSharePercentage(item.value, total)}%`,
                  background: `linear-gradient(90deg, ${item.accent} 0%, ${accentToRgba(item.accent, 0.7)} 100%)`,
                  boxShadow: `0 8px 18px ${accentToRgba(item.accent, 0.2)}`,
                }}
              />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
