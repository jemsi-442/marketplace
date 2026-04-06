'use client';

import type { AdminMetricsTrendPoint } from '@/lib/types';

interface MetricsTrendChartProps {
  points: AdminMetricsTrendPoint[];
}

function getVolume(point: AdminMetricsTrendPoint): number {
  return typeof point.totalVolumeMinor === 'number' ? point.totalVolumeMinor : 0;
}

function getRisk(point: AdminMetricsTrendPoint): number {
  return typeof point.highRiskEscrowPercentage === 'number' ? point.highRiskEscrowPercentage : 0;
}

function getDate(point: AdminMetricsTrendPoint): string {
  return typeof point.snapshotDate === 'string' ? point.snapshotDate : 'n/a';
}

export function MetricsTrendChart({ points }: MetricsTrendChartProps) {
  if (!points.length) {
    return null;
  }

  const width = 920;
  const height = 280;
  const paddingX = 28;
  const paddingTop = 18;
  const paddingBottom = 34;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;
  const maxVolume = Math.max(...points.map(getVolume), 1);
  const safeRiskMax = Math.max(...points.map(getRisk), 100);

  const volumePoints = points.map((point, index) => {
    const x = paddingX + (index * chartWidth) / Math.max(points.length - 1, 1);
    const y = paddingTop + chartHeight - (getVolume(point) / maxVolume) * chartHeight;

    return { x, y, point };
  });

  const riskPoints = points.map((point, index) => {
    const x = paddingX + (index * chartWidth) / Math.max(points.length - 1, 1);
    const y = paddingTop + chartHeight - (getRisk(point) / safeRiskMax) * chartHeight;

    return { x, y, point };
  });

  const volumeArea = [
    `M ${volumePoints[0]?.x ?? paddingX} ${paddingTop + chartHeight}`,
    ...volumePoints.map(({ x, y }) => `L ${x} ${y}`),
    `L ${volumePoints[volumePoints.length - 1]?.x ?? paddingX} ${paddingTop + chartHeight}`,
    'Z',
  ].join(' ');

  const volumeLine = volumePoints.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const riskLine = riskPoints.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-primary)]">Performance graph</p>
          <h3 className="mt-2 font-display text-2xl text-[var(--text-primary)]">Volume and risk across the selected window</h3>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
          <span className="inline-flex items-center rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-2">
            <span className="mr-2 size-2 rounded-full bg-[var(--accent-cyan)]" />
            Volume
          </span>
          <span className="inline-flex items-center rounded-full border border-[rgba(249,115,22,0.16)] bg-[rgba(249,115,22,0.08)] px-3 py-2">
            <span className="mr-2 size-2 rounded-full bg-[var(--accent-coral)]" />
            Risk
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ['Latest volume', getVolume(points[points.length - 1])],
          ['Peak volume', Math.max(...points.map(getVolume))],
          ['Peak risk', `${Math.max(...points.map(getRisk))}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[280px] w-full overflow-visible">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + ratio * chartHeight;
            return (
              <line
                key={ratio}
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.22)"
                strokeWidth="1"
                strokeDasharray="4 8"
              />
            );
          })}

          <path d={volumeArea} fill="url(#volumeFill)" />
          <path d={volumeLine} fill="none" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" />
          <path d={riskLine} fill="none" stroke="var(--accent-coral)" strokeWidth="3" strokeLinecap="round" />

          {volumePoints.map(({ x, y, point }, index) => (
            <g key={`${getDate(point)}-${index}`}>
              <circle cx={x} cy={y} r="4.5" fill="var(--accent-cyan)" />
              <circle cx={riskPoints[index]?.x ?? x} cy={riskPoints[index]?.y ?? y} r="4.5" fill="var(--accent-coral)" />
              <text x={x} y={height - 8} textAnchor="middle" fill="var(--text-tertiary)" fontSize="11" style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {getDate(point).slice(5)}
              </text>
            </g>
          ))}

          <defs>
            <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(56,189,248,0.22)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.03)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {points.slice(-3).map((point) => (
          <div key={getDate(point)} className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{getDate(point)}</p>
            <p className="mt-3 text-lg text-[var(--text-primary)]">{getVolume(point)}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Risk {getRisk(point)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
