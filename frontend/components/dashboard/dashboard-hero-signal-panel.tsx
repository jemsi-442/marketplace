import { accentToRgba, clampPercentage } from '@/components/dashboard/chart-utils';

export interface HeroSignalItem {
  label: string;
  value: number;
  tone: string;
  helper?: string;
}

interface DashboardHeroSignalPanelProps {
  title: string;
  items: HeroSignalItem[];
}

export function DashboardHeroSignalPanel({
  title,
  items,
}: DashboardHeroSignalPanelProps) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{title}</p>
        <span className="rounded-full border border-[var(--line)] bg-white/84 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--text-tertiary)] shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
          Live desk
        </span>
      </div>
      <div className="mt-4 space-y-3 sm:space-y-4">
        {items.map((item) => {
          const value = clampPercentage(item.value);

          return (
            <div key={item.label} className="rounded-[20px] border border-[rgba(148,163,184,0.14)] bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.96))] p-3 sm:p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: item.tone }} />
                    <p className="truncate text-sm font-medium text-[var(--text-secondary)]">{item.label}</p>
                  </div>
                  {item.helper ? <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">{item.helper}</p> : null}
                </div>
                <span
                  className="rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]"
                  style={{
                    borderColor: accentToRgba(item.tone, 0.24),
                    backgroundColor: accentToRgba(item.tone, 0.1),
                    color: 'var(--text-primary)',
                  }}
                >
                  {value}%
                </span>
              </div>
              <div className="mt-3 h-2.5 rounded-full bg-[rgba(226,232,240,0.9)] p-[2px] sm:mt-3.5">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(value, value > 0 ? 8 : 0)}%`,
                    background: `linear-gradient(90deg, ${accentToRgba(item.tone, 0.8)} 0%, ${item.tone} 100%)`,
                    boxShadow: `0 8px 18px ${accentToRgba(item.tone, 0.18)}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
