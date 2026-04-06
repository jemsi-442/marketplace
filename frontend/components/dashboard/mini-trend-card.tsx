interface MiniTrendPoint {
  label: string;
  value: number;
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

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
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
  const safePoints = points.length
    ? points
    : [
        { label: 'P1', value: 0 },
        { label: 'P2', value: 0 },
        { label: 'P3', value: 0 },
        { label: 'P4', value: 0 },
      ];
  const chartWidth = 420;
  const chartHeight = 140;
  const paddingX = 16;
  const paddingY = 16;
  const maxValue = Math.max(...safePoints.map((point) => point.value), 1);
  const stepX = (chartWidth - paddingX * 2) / Math.max(safePoints.length - 1, 1);
  const line = safePoints
    .map((point, index) => {
      const x = paddingX + index * stepX;
      const y = chartHeight - paddingY - (point.value / maxValue) * (chartHeight - paddingY * 2);

      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
  const area = `${line} L ${paddingX + stepX * (safePoints.length - 1)} ${chartHeight - paddingY} L ${paddingX} ${chartHeight - paddingY} Z`;
  const total = safePoints.reduce((sum, point) => sum + point.value, 0);
  const latest = safePoints[safePoints.length - 1]?.value ?? 0;
  const peak = Math.max(...safePoints.map((point) => point.value), 0);

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
            borderColor: `${accent}33`,
            backgroundColor: `${accent}14`,
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
            <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{formatCompact(Number(value))}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-36 w-full">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingY + ratio * (chartHeight - paddingY * 2);
            return (
              <line
                key={ratio}
                x1={paddingX}
                x2={chartWidth - paddingX}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.16)"
                strokeWidth="1"
                strokeDasharray="4 7"
              />
            );
          })}
          <path d={area} fill={`${accent}20`} />
          <path d={line} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          {safePoints.map((point, index) => {
            const x = paddingX + index * stepX;
            const y = chartHeight - paddingY - (point.value / maxValue) * (chartHeight - paddingY * 2);

            return (
              <g key={`${point.label}-${index}`}>
                <circle cx={x} cy={y} r="4.5" fill={accent} />
                <text x={x} y={chartHeight - 4} textAnchor="middle" fill="var(--text-tertiary)" fontSize="11">
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Signal graph
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{safePoints.length} recent points</p>
      </div>
    </div>
  );
}
