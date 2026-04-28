'use client';

import { useId, useState } from 'react';

import {
  accentToRgba,
  buildSmoothPath,
  buildTrendGeometry,
  createLinearTicks,
  formatChartDateLabel,
  formatCompactMoney,
  parseTimestamp,
} from '@/components/dashboard/chart-utils';
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
  const volumeGradientId = useId().replace(/:/g, '');
  const riskGradientId = `${volumeGradientId}-risk`;
  const chartId = `${volumeGradientId}-metrics`;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!points.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-[var(--line)] bg-[var(--panel-muted)] px-5 py-12 text-center text-sm text-[var(--text-secondary)]">
        Trend data will appear here once the selected window has enough metrics snapshots.
      </div>
    );
  }

  const width = 920;
  const height = 300;
  const maxVolume = Math.max(...points.map(getVolume), 1);
  const safeRiskMax = Math.max(...points.map(getRisk), 100);
  const labels = points.map((point) => formatChartDateLabel(getDate(point), getDate(point).slice(5)));
  const timestamps = points.map((point) => parseTimestamp(getDate(point)));
  const volumeGeometry = buildTrendGeometry(
    points.map((point, index) => ({
      label: labels[index] ?? getDate(point).slice(5),
      value: getVolume(point),
      timestamp: timestamps[index],
    })),
    {
      width,
      height,
      paddingLeft: 62,
      paddingRight: 62,
      paddingTop: 24,
      paddingBottom: 38,
      maxValue: maxVolume,
    },
  );
  const riskGeometry = buildTrendGeometry(
    points.map((point, index) => ({
      label: labels[index] ?? getDate(point).slice(5),
      value: getRisk(point),
      timestamp: timestamps[index],
    })),
    {
      width,
      height,
      paddingLeft: 62,
      paddingRight: 62,
      paddingTop: 24,
      paddingBottom: 38,
      maxValue: safeRiskMax,
    },
  );
  const volumeTicks = createLinearTicks(volumeGeometry.maxValue, 4);
  const riskTicks = createLinearTicks(riskGeometry.maxValue, 4);
  const volumeLinePath = buildSmoothPath(volumeGeometry.plotPoints);
  const riskLinePath = buildSmoothPath(riskGeometry.plotPoints);
  const volumeAreaPath = volumeGeometry.plotPoints.length
    ? `${volumeLinePath} L ${volumeGeometry.plotPoints[volumeGeometry.plotPoints.length - 1]?.x ?? 62} ${volumeGeometry.baseY} L ${volumeGeometry.plotPoints[0]?.x ?? 62} ${volumeGeometry.baseY} Z`
    : '';
  const latestVolumePoint = volumeGeometry.plotPoints[volumeGeometry.plotPoints.length - 1];
  const latestRiskPoint = riskGeometry.plotPoints[riskGeometry.plotPoints.length - 1];
  const activeVolumePoint = activeIndex === null ? null : volumeGeometry.plotPoints[activeIndex] ?? null;
  const activeRiskPoint = activeIndex === null ? null : riskGeometry.plotPoints[activeIndex] ?? null;
  const peakVolumePoint = volumeGeometry.plotPoints.reduce<(typeof volumeGeometry.plotPoints)[number] | null>((best, point) => {
    if (!best || point.value > best.value) {
      return point;
    }

    return best;
  }, null);
  const bands = volumeGeometry.plotPoints.map((point, index) => {
    const previous = volumeGeometry.plotPoints[index - 1];
    const next = volumeGeometry.plotPoints[index + 1];
    const x1 = previous ? (previous.x + point.x) / 2 : 62;
    const x2 = next ? (point.x + next.x) / 2 : width - 62;

    return {
      x: x1,
      width: Math.max(x2 - x1, 16),
      active: index === volumeGeometry.plotPoints.length - 1,
    };
  });

  const renderCallout = (x: number, y: number, label: string, tone: string) => {
    const calloutWidth = Math.max(84, label.length * 7.2 + 22);
    const boxX = Math.max(62, Math.min(x - calloutWidth / 2, width - 62 - calloutWidth + 10));
    const boxY = Math.max(8, y - 42);

    return (
      <g key={`${label}-${x}-${y}`}>
        <line x1={x} x2={x} y1={boxY + 28} y2={y - 12} stroke={accentToRgba(tone, 0.3)} strokeDasharray="3 4" />
        <rect x={boxX} y={boxY} width={calloutWidth} height="28" rx="14" fill="rgba(255,255,255,0.95)" stroke={accentToRgba(tone, 0.28)} />
        <text x={boxX + 11} y={boxY + 18} fill="var(--text-primary)" fontSize="11" fontWeight="600">
          {label}
        </text>
      </g>
    );
  };

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
          ['Latest volume', formatCompactMoney(getVolume(points[points.length - 1]))],
          ['Peak volume', formatCompactMoney(Math.max(...points.map(getVolume)))],
          ['Peak risk', `${Math.max(...points.map(getRisk))}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[300px] w-full overflow-visible animate-fade-up"
          role="img"
          aria-labelledby={chartId}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <title id={chartId}>Marketplace volume and risk trend</title>

          {bands.map((band, index) => (
            <rect
              key={`band-${index}`}
              x={band.x}
              y="16"
              width={band.width}
              height={volumeGeometry.chartHeight + 18}
              rx="22"
              fill={band.active ? 'rgba(56,189,248,0.08)' : index % 2 === 0 ? 'rgba(56,189,248,0.04)' : 'rgba(249,115,22,0.025)'}
            />
          ))}

          {volumeTicks.map((tick) => {
            const y = volumeGeometry.baseY - (tick / Math.max(volumeGeometry.maxValue, 1)) * volumeGeometry.chartHeight;
            return (
              <g key={tick}>
                <line
                  x1="62"
                  x2={width - 62}
                  y1={y}
                  y2={y}
                  stroke="rgba(148,163,184,0.22)"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                />
                <text x="0" y={y + 4} fill="var(--text-tertiary)" fontSize="11">
                  {formatCompactMoney(tick)}
                </text>
              </g>
            );
          })}

          {riskTicks.map((tick) => {
            const y = riskGeometry.baseY - (tick / Math.max(riskGeometry.maxValue, 1)) * riskGeometry.chartHeight;
            return (
              <text key={`risk-${tick}`} x={width - 48} y={y + 4} fill="var(--text-tertiary)" fontSize="11" textAnchor="start">
                {tick}%
              </text>
            );
          })}

          {volumeGeometry.plotPoints.map((point, index) => (
            <line
              key={`stem-${point.label}-${index}`}
              x1={point.x}
              x2={point.x}
              y1={point.y}
              y2={volumeGeometry.baseY}
              stroke={accentToRgba('var(--accent-cyan)', 0.1)}
            />
          ))}

          <path d={volumeAreaPath} fill={`url(#${volumeGradientId})`} />
          <path d={volumeLinePath} fill="none" stroke={accentToRgba('var(--accent-cyan)', 0.2)} strokeWidth="10" strokeLinecap="round" />
          <path d={volumeLinePath} fill="none" stroke="var(--accent-cyan)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d={riskLinePath} fill="none" stroke={accentToRgba('var(--accent-coral)', 0.18)} strokeWidth="8" strokeLinecap="round" />
          <path d={riskLinePath} fill="none" stroke={`url(#${riskGradientId})`} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="8 7" />

          {volumeGeometry.plotPoints.map((point, index) => {
            const isLatest = index === volumeGeometry.plotPoints.length - 1;
            const isPeak = point === peakVolumePoint;
            const isActive = activeIndex === index;

            return (
              <g key={`${point.label}-${index}`}>
                {(isLatest || isPeak || isActive) ? <circle cx={point.x} cy={point.y} r={isActive ? '14' : isLatest ? '12' : '10'} fill={accentToRgba('var(--accent-cyan)', isActive ? 0.2 : isLatest ? 0.16 : 0.1)} /> : null}
                <circle cx={point.x} cy={point.y} r={isActive ? '6.5' : isLatest ? '6' : isPeak ? '5.5' : '4.5'} fill="var(--accent-cyan)" stroke="rgba(255,255,255,0.96)" strokeWidth="2" />
                <circle
                  cx={riskGeometry.plotPoints[index]?.x ?? point.x}
                  cy={riskGeometry.plotPoints[index]?.y ?? point.y}
                  r={isActive ? '6' : index === riskGeometry.plotPoints.length - 1 ? '5.5' : '4.5'}
                  fill="var(--accent-coral)"
                  stroke="rgba(255,255,255,0.96)"
                  strokeWidth="2"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="18"
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.label}: volume ${formatCompactMoney(point.value)}, risk ${riskGeometry.plotPoints[index]?.value ?? 0}%`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex((current) => (current === index ? null : current))}
                  onBlur={() => setActiveIndex((current) => (current === index ? null : current))}
                >
                  <title>{`${point.label}: volume ${formatCompactMoney(point.value)}, risk ${riskGeometry.plotPoints[index]?.value ?? 0}%`}</title>
                </circle>
                <text x={point.x} y={height - 8} textAnchor="middle" fill="var(--text-tertiary)" fontSize="11">
                  {point.label}
                </text>
              </g>
            );
          })}

          {activeVolumePoint
            ? renderCallout(activeVolumePoint.x, activeVolumePoint.y, `${activeVolumePoint.label} ${formatCompactMoney(activeVolumePoint.value)}`, 'var(--accent-cyan)')
            : latestVolumePoint
              ? renderCallout(latestVolumePoint.x, latestVolumePoint.y, `Volume ${formatCompactMoney(latestVolumePoint.value)}`, 'var(--accent-cyan)')
              : null}
          {activeRiskPoint
            ? renderCallout(activeRiskPoint.x, activeRiskPoint.y, `${activeRiskPoint.label} ${activeRiskPoint.value}%`, 'var(--accent-coral)')
            : latestRiskPoint
              ? renderCallout(latestRiskPoint.x, latestRiskPoint.y, `Risk ${latestRiskPoint.value}%`, 'var(--accent-coral)')
              : null}

          <defs>
            <linearGradient id={volumeGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentToRgba('var(--accent-cyan)', 0.28)} />
              <stop offset="64%" stopColor={accentToRgba('var(--accent-cyan)', 0.1)} />
              <stop offset="100%" stopColor={accentToRgba('var(--accent-cyan)', 0.03)} />
            </linearGradient>
            <linearGradient id={riskGradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accentToRgba('var(--accent-coral)', 0.75)} />
              <stop offset="100%" stopColor="var(--accent-coral)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {points.slice(-3).map((point) => (
          <div key={getDate(point)} className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{formatChartDateLabel(getDate(point), getDate(point))}</p>
            <p className="mt-3 text-lg text-[var(--text-primary)]">{formatCompactMoney(getVolume(point))}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Risk {getRisk(point)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
