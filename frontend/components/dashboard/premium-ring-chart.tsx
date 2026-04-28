'use client';

import { useState } from 'react';

import { accentToRgba, type RingSegmentGeometry } from '@/components/dashboard/chart-utils';

interface PremiumRingChartProps {
  segments: RingSegmentGeometry[];
  radius: number;
  totalLabel: string | number;
  totalCaption: string;
  trackColor?: string;
}

export function PremiumRingChart({
  segments,
  radius,
  totalLabel,
  totalCaption,
  trackColor = 'rgba(226,232,240,0.9)',
}: PremiumRingChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const size = 180;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const activeSegment = activeIndex === null ? null : segments[activeIndex] ?? null;
  const displayLabel = activeSegment ? `${activeSegment.percentage}%` : totalLabel;
  const displayCaption = activeSegment ? activeSegment.label : totalCaption;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="size-44 overflow-visible animate-fade-up"
      role="img"
      aria-label="Ring chart"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <defs>
        {segments.map((segment, index) => (
          <radialGradient key={`glow-${segment.label}-${index}`} id={`ring-glow-${index}`} cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor={accentToRgba(segment.color, 0.26)} />
            <stop offset="100%" stopColor={accentToRgba(segment.color, 0)} />
          </radialGradient>
        ))}
      </defs>

      {segments.slice(0, 2).map((segment, index) => (
        <circle
          key={`glow-${segment.label}-${index}`}
          cx={center}
          cy={center}
          r={radius + 18 + (index * 4)}
          fill={`url(#ring-glow-${index})`}
        />
      ))}

      <circle cx={center} cy={center} r={radius + 8} fill="none" stroke="rgba(255,255,255,0.74)" strokeWidth="8" />
      <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth="18" />

      {segments.map((segment, index) => {
        const isActive = activeIndex === index;

        return (
          <g key={`${segment.label}-${index}`}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={isActive ? '20' : '18'}
              strokeDasharray={`${segment.dash} ${circumference}`}
              strokeDashoffset={segment.offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              style={{
                filter: `drop-shadow(0 10px 20px ${accentToRgba(segment.color, isActive ? 0.3 : 0.22)})`,
                transition: 'stroke-width 180ms ease, filter 180ms ease',
              }}
            />
            <circle
              cx={center}
              cy={center}
              r={radius + 13}
              fill="none"
              stroke="transparent"
              strokeWidth="20"
              strokeDasharray={`${segment.dash} ${circumference}`}
              strokeDashoffset={segment.offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              tabIndex={0}
              role="button"
              aria-label={`${segment.label}: ${segment.value}, ${segment.percentage}%`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex((current) => (current === index ? null : current))}
              onBlur={() => setActiveIndex((current) => (current === index ? null : current))}
            >
              <title>{`${segment.label}: ${segment.value}, ${segment.percentage}%`}</title>
            </circle>
          </g>
        );
      })}

      <circle cx={center} cy={center} r={radius - 20} fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.92)" strokeWidth="2" />
      <circle cx={center} cy={center} r={radius - 27} fill="rgba(248,250,252,0.92)" />

      {activeSegment ? (
        <rect
          x={center - 46}
          y={center - 54}
          width="92"
          height="22"
          rx="11"
          fill={accentToRgba(activeSegment.color, 0.12)}
          stroke={accentToRgba(activeSegment.color, 0.24)}
        />
      ) : null}

      {activeSegment ? (
        <text x={center} y={center - 39} textAnchor="middle" fill={activeSegment.color} fontSize="10" fontWeight="600" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          active slice
        </text>
      ) : null}

      <text x={center} y={center - 4} textAnchor="middle" fill="var(--text-primary)" fontSize={activeSegment ? '28' : '34'} fontWeight="700">
        {displayLabel}
      </text>
      <text
        x={center}
        y={center + 18}
        textAnchor="middle"
        fill="var(--text-secondary)"
        fontSize={activeSegment ? '10' : '11'}
        style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}
      >
        {displayCaption}
      </text>
    </svg>
  );
}
