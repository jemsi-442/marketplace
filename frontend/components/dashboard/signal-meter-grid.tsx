import { accentToRgba, clampPercentage } from '@/components/dashboard/chart-utils';

interface SignalMeterItem {
  label: string;
  value: number;
  color: string;
  helper?: string;
}

interface SignalMeterGridProps {
  items: SignalMeterItem[];
  columnsClassName?: string;
}

function buildColumns(value: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const threshold = ((index + 1) / 12) * 100;
    const active = value >= threshold;

    return {
      active,
      height: active ? 22 + ((index % 4) * 6) : 18 + ((index % 3) * 4),
    };
  });
}

export function SignalMeterGrid({
  items,
  columnsClassName = 'lg:grid-cols-3',
}: SignalMeterGridProps) {
  return (
    <div className={`grid gap-4 ${columnsClassName}`}>
      {items.map((item) => {
        const clampedValue = clampPercentage(item.value);
        const columns = buildColumns(clampedValue);

        return (
          <div
            key={item.label}
            className="relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(15,23,42,0.08)] animate-fade-up"
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-24"
              style={{
                background: `radial-gradient(circle at top right, ${accentToRgba(item.color, 0.18)} 0%, rgba(255,255,255,0) 68%)`,
              }}
            />

            <div className="relative z-[1] flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.label}</p>
              <span
                className="rounded-full border px-3 py-1.5 text-[11px] font-medium"
                style={{
                  borderColor: accentToRgba(item.color, 0.24),
                  backgroundColor: accentToRgba(item.color, 0.09),
                  color: 'var(--text-primary)',
                }}
              >
                {clampedValue}%
              </span>
            </div>

            <div className="relative z-[1] mt-4">
              <div className="flex h-14 items-end gap-1.5 rounded-[18px] border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.82)] px-3 py-2">
                {columns.map((column, index) => (
                  <span
                    key={`${item.label}-${index}`}
                    className="block w-full rounded-full transition duration-300"
                    style={{
                      height: `${column.height}px`,
                      background: column.active
                        ? `linear-gradient(180deg, ${accentToRgba(item.color, 0.45)} 0%, ${item.color} 100%)`
                        : 'linear-gradient(180deg, rgba(226,232,240,0.42) 0%, rgba(203,213,225,0.78) 100%)',
                      boxShadow: column.active ? `0 10px 22px ${accentToRgba(item.color, 0.2)}` : 'none',
                      opacity: column.active ? 1 : 0.72,
                    }}
                  />
                ))}
              </div>

              <div className="mt-4 h-3 rounded-full bg-[rgba(148,163,184,0.16)] p-[3px]">
                <div
                  className="relative h-full rounded-full"
                  style={{
                    width: `${Math.max(clampedValue, clampedValue > 0 ? 8 : 0)}%`,
                    background: `linear-gradient(90deg, ${accentToRgba(item.color, 0.92)} 0%, ${item.color} 55%, ${accentToRgba(item.color, 0.58)} 100%)`,
                  }}
                >
                  {clampedValue > 0 ? (
                    <span
                      className="absolute right-0 top-1/2 size-3 -translate-y-1/2 rounded-full border border-white/80"
                      style={{ backgroundColor: item.color, boxShadow: `0 0 0 6px ${accentToRgba(item.color, 0.16)}` }}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {item.helper ? <p className="relative z-[1] mt-3 text-sm text-[var(--text-secondary)]">{item.helper}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
