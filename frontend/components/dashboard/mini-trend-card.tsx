import {
  accentToRgba,
  formatCompactNumber,
} from '@/components/dashboard/chart-utils';
import { TrendStage } from '@/components/dashboard/trend-stage';

interface MiniTrendPoint {
  label: string;
  value: number;
  timestamp?: number;
}

interface MiniTrendCardProps {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  valueLabel: string;
  accent: string;
  points: MiniTrendPoint[];
}

export function MiniTrendCard({
  eyebrow,
  title,
  description,
  badge,
  valueLabel,
  accent,
  points,
}: MiniTrendCardProps) {
  const hasData = points.length > 0;
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const latest = points[points.length - 1]?.value ?? 0;
  const previous = points[points.length - 2]?.value ?? null;
  const peak = Math.max(...points.map((point) => point.value), 0);
  const delta = previous === null ? null : latest - previous;

  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.96)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{eyebrow}</p>
          <h3 className="mt-2 font-display text-[1.35rem] leading-tight tracking-[-0.03em] text-[var(--text-primary)]">{title}</h3>
          <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{description}</p>
        </div>
        <div
          className="rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.16em]"
          style={{
            borderColor: accentToRgba(accent, 0.22),
            backgroundColor: accentToRgba(accent, 0.1),
            color: accent,
          }}
        >
          {badge}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ['Latest', latest],
          ['Peak', peak],
          [valueLabel, total],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</p>
            <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{hasData ? formatCompactNumber(Number(value)) : '--'}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        {hasData ? (
          <TrendStage
            points={points}
            accent={accent}
            width={420}
            height={160}
            paddingLeft={14}
            paddingRight={50}
            paddingTop={18}
            paddingBottom={28}
            valueFormatter={formatCompactNumber}
          />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-[20px] border border-dashed border-[var(--line)] bg-[var(--panel-muted)] px-5 text-center text-sm text-[var(--text-secondary)]">
            Trend data will appear here once recent activity reaches this lane.
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          {delta === null ? 'Waiting for trend' : delta >= 0 ? `Up ${formatCompactNumber(delta)}` : `Down ${formatCompactNumber(Math.abs(delta))}`}
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{points.length} recent points</p>
      </div>
    </div>
  );
}
