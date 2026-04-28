'use client';

import { useId, useState } from 'react';

import {
  accentToRgba,
  buildSmoothPath,
  buildTrendGeometry,
  createLinearTicks,
} from '@/components/dashboard/chart-utils';

interface TrendStagePoint {
  label: string;
  value: number;
  timestamp?: number | null;
}

interface TrendStageProps {
  points: TrendStagePoint[];
  accent: string;
  height?: number;
  width?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  valueFormatter: (value: number) => string;
}

function getAreaPath(path: string, firstX: number, lastX: number, baseY: number): string {
  if (!path) {
    return '';
  }

  return `${path} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
}

export function TrendStage({
  points,
  accent,
  height = 176,
  width = 520,
  paddingBottom = 30,
  paddingLeft = 18,
  paddingRight = 62,
  paddingTop = 18,
  valueFormatter,
}: TrendStageProps) {
  const gradientId = useId().replace(/:/g, '');
  const chartId = `${gradientId}-chart`;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const geometry = buildTrendGeometry(points, {
    width,
    height,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
  });
  const tickValues = createLinearTicks(geometry.maxValue, 4);
  const smoothLinePath = buildSmoothPath(geometry.plotPoints);
  const firstPoint = geometry.plotPoints[0];
  const lastPoint = geometry.plotPoints[geometry.plotPoints.length - 1];
  const smoothAreaPath = firstPoint && lastPoint ? getAreaPath(smoothLinePath, firstPoint.x, lastPoint.x, geometry.baseY) : '';
  const latestPoint = lastPoint;
  const peakPoint = geometry.plotPoints.reduce<(typeof geometry.plotPoints)[number] | null>((best, point) => {
    if (!best || point.value > best.value) {
      return point;
    }

    return best;
  }, null);
  const chartStart = paddingLeft;
  const chartEnd = width - paddingRight;
  const bands = geometry.plotPoints.map((point, index) => {
    const previous = geometry.plotPoints[index - 1];
    const next = geometry.plotPoints[index + 1];
    const x1 = previous ? (previous.x + point.x) / 2 : chartStart;
    const x2 = next ? (point.x + next.x) / 2 : chartEnd;

    return {
      x: x1,
      width: Math.max(x2 - x1, 10),
      active: index === geometry.plotPoints.length - 1,
    };
  });
  const activePoint = activeIndex === null ? null : geometry.plotPoints[activeIndex] ?? null;

  const renderCallout = (
    point: NonNullable<typeof latestPoint>,
    label: string,
    tone: string,
    kind: 'latest' | 'peak',
  ) => {
    const calloutWidth = Math.max(88, label.length * 7.2 + 22);
    const rawX = point.x - calloutWidth / 2;
    const boxX = Math.max(chartStart, Math.min(rawX, chartEnd - calloutWidth + 8));
    const boxY = Math.max(6, point.y - (kind === 'latest' ? 48 : 36));

    return (
      <g key={`${kind}-${point.label}-${point.x}`}>
        <line
          x1={point.x}
          x2={point.x}
          y1={boxY + 28}
          y2={point.y - 12}
          stroke={accentToRgba(tone, 0.32)}
          strokeDasharray="3 4"
        />
        <rect
          x={boxX}
          y={boxY}
          width={calloutWidth}
          height="28"
          rx="14"
          fill="rgba(255,255,255,0.95)"
          stroke={accentToRgba(tone, 0.28)}
        />
        <text x={boxX + 11} y={boxY + 18} fill="var(--text-primary)" fontSize="11" fontWeight="600">
          {label}
        </text>
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-44 w-full overflow-visible animate-fade-up"
      role="img"
      aria-labelledby={chartId}
      onMouseLeave={() => setActiveIndex(null)}
    >
      <title id={chartId}>Analytics trend chart</title>

      {bands.map((band, index) => (
        <rect
          key={`band-${index}`}
          x={band.x}
          y={paddingTop - 4}
          width={band.width}
          height={geometry.chartHeight + 10}
          rx="18"
          fill={band.active ? accentToRgba(accent, 0.08) : accentToRgba(accent, index % 2 === 0 ? 0.04 : 0.02)}
        />
      ))}

      {tickValues.map((tick) => {
        const y = geometry.baseY - ((tick - geometry.minValue) / Math.max(geometry.maxValue - geometry.minValue, 1)) * geometry.chartHeight;
        return (
          <g key={tick}>
            <line
              x1={chartStart}
              x2={chartEnd}
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.18)"
              strokeWidth="1"
              strokeDasharray="4 7"
            />
            <text x={width - paddingRight + 8} y={y + 4} fill="var(--text-tertiary)" fontSize="11">
              {valueFormatter(tick)}
            </text>
          </g>
        );
      })}

      {geometry.plotPoints.map((point) => (
        <line
          key={`stem-${point.label}-${point.x}`}
          x1={point.x}
          x2={point.x}
          y1={point.y}
          y2={geometry.baseY}
          stroke={accentToRgba(accent, 0.12)}
        />
      ))}

      <path d={smoothAreaPath} fill={`url(#${gradientId})`} />
      <path d={smoothLinePath} fill="none" stroke={accentToRgba(accent, 0.2)} strokeWidth="10" strokeLinecap="round" />
      <path d={smoothLinePath} fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

      {geometry.plotPoints.map((point, index) => {
        const isLatest = index === geometry.plotPoints.length - 1;
        const isPeak = point === peakPoint;
        const isActive = activeIndex === index;

        return (
          <g key={`${point.label}-${index}`}>
            {(isLatest || isPeak || isActive) ? <circle cx={point.x} cy={point.y} r={isActive ? '14' : '12'} fill={accentToRgba(accent, isActive ? 0.2 : isLatest ? 0.16 : 0.09)} /> : null}
            <circle cx={point.x} cy={point.y} r={isActive ? '6.5' : isLatest ? '6' : isPeak ? '5.5' : '4.5'} fill={accent} stroke="rgba(255,255,255,0.95)" strokeWidth="2" />
            <circle
              cx={point.x}
              cy={point.y}
              r="16"
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${point.label}: ${valueFormatter(point.value)}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex((current) => (current === index ? null : current))}
              onBlur={() => setActiveIndex((current) => (current === index ? null : current))}
            >
              <title>{`${point.label}: ${valueFormatter(point.value)}`}</title>
            </circle>
            <text x={point.x} y={height - 6} textAnchor="middle" fill="var(--text-tertiary)" fontSize="11">
              {point.label}
            </text>
          </g>
        );
      })}

      {activePoint
        ? renderCallout(activePoint, `${activePoint.label} ${valueFormatter(activePoint.value)}`, accent, 'latest')
        : latestPoint
          ? renderCallout(latestPoint, `Latest ${valueFormatter(latestPoint.value)}`, accent, 'latest')
          : null}
      {!activePoint && peakPoint && peakPoint !== latestPoint ? renderCallout(peakPoint, `Peak ${valueFormatter(peakPoint.value)}`, accentToRgba(accent, 0.9), 'peak') : null}

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentToRgba(accent, 0.28)} />
          <stop offset="60%" stopColor={accentToRgba(accent, 0.1)} />
          <stop offset="100%" stopColor={accentToRgba(accent, 0.02)} />
        </linearGradient>
      </defs>
    </svg>
  );
}
