'use client';

import {
  accentToRgba,
  buildTrendGeometry,
  createLinearTicks,
} from '@/components/dashboard/chart-utils';
import { useId } from 'react';

import type { AttemptTrendPoint } from '../admin-verification-detail.utils';

interface AdminVerificationAttemptTrendChartProps {
  points: AttemptTrendPoint[];
}

export function AdminVerificationAttemptTrendChart({
  points,
}: AdminVerificationAttemptTrendChartProps) {
  const gradientId = useId().replace(/:/g, '');

  if (!points.length) {
    return null;
  }

  const width = 520;
  const height = 168;
  const geometry = buildTrendGeometry(points, {
    width,
    height,
    paddingLeft: 18,
    paddingRight: 48,
    paddingTop: 18,
    paddingBottom: 28,
    minValue: 0,
    maxValue: 100,
  });
  const ticks = createLinearTicks(100, 5);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full overflow-visible">
      {ticks.map((tick) => {
        const y =
          geometry.baseY -
          ((tick - geometry.minValue) /
            Math.max(geometry.maxValue - geometry.minValue, 1)) *
            geometry.chartHeight;

        return (
          <g key={tick}>
            <line
              x1="18"
              x2={width - 48}
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.16)"
              strokeWidth="1"
              strokeDasharray="4 7"
            />
            <text
              x={width - 42}
              y={y + 4}
              fill="var(--text-tertiary)"
              fontSize="11"
            >
              {tick}%
            </text>
          </g>
        );
      })}

      <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
      <path
        d={geometry.linePath}
        fill="none"
        stroke="var(--accent-violet)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {geometry.plotPoints.map((point, index) => {
        const isLatest = index === geometry.plotPoints.length - 1;

        return (
          <g key={`${point.label}-${index}`}>
            {isLatest ? (
              <circle
                cx={point.x}
                cy={point.y}
                r="10"
                fill={accentToRgba('var(--accent-violet)', 0.14)}
              />
            ) : null}
            <circle
              cx={point.x}
              cy={point.y}
              r={isLatest ? '5.5' : '4.5'}
              fill="var(--accent-violet)"
            />
            <text
              x={point.x}
              y={height - 4}
              textAnchor="middle"
              fill="var(--text-tertiary)"
              fontSize="11"
            >
              {point.label}
            </text>
          </g>
        );
      })}

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={accentToRgba('var(--accent-violet)', 0.24)}
          />
          <stop
            offset="100%"
            stopColor={accentToRgba('var(--accent-violet)', 0.04)}
          />
        </linearGradient>
      </defs>
    </svg>
  );
}
