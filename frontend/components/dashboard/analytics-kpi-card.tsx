import { accentToRgba } from '@/components/dashboard/chart-utils';

interface AnalyticsKpiCardProps {
  label: string;
  value: string;
  detail: string;
  accent: string;
  chip?: string;
  tone?: string;
}

export function AnalyticsKpiCard({
  label,
  value,
  detail,
  accent,
  chip = 'Live pulse',
  tone,
}: AnalyticsKpiCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-[24px] border border-[var(--line)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] animate-fade-up"
      style={{
        background: `linear-gradient(180deg, ${tone ?? accentToRgba(accent, 0.08)} 0%, rgba(255,255,255,0.98) 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background: `radial-gradient(circle at top right, ${accentToRgba(accent, 0.2)} 0%, rgba(255,255,255,0) 72%)`,
        }}
      />
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="size-2 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.72)]"
              style={{ backgroundColor: accent }}
            />
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{label}</p>
          </div>
          <p className="mt-3 font-display text-[1.7rem] leading-none tracking-[-0.04em] text-[var(--text-primary)] sm:text-[1.9rem]">{value}</p>
        </div>
        <span
          className="rounded-full border px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
          style={{
            borderColor: accentToRgba(accent, 0.24),
            backgroundColor: accentToRgba(accent, 0.1),
            color: accent,
          }}
        >
          {chip}
        </span>
      </div>

      <div className="relative z-[1] mt-4">
        <div className="h-[3px] w-full rounded-full bg-[rgba(255,255,255,0.7)]">
          <div
            className="h-[3px] rounded-full transition duration-300 group-hover:w-full"
            style={{
              width: '72%',
              background: `linear-gradient(90deg, ${accentToRgba(accent, 0.65)} 0%, ${accent} 100%)`,
              boxShadow: `0 8px 18px ${accentToRgba(accent, 0.24)}`,
            }}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
      </div>
    </div>
  );
}
